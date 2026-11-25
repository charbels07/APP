/**
 * The server function that sends the team's e-mails ("caa-mail"), played here with a pretend
 * database and a pretend mailbox: it only carries what the database hands out, to one address.
 */
type Handler = (req: Request) => Promise<Response>;

const mockSendMail = jest.fn();
const mockRpc = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));
const mockCreateClient = jest.fn(() => ({ rpc: mockRpc }));
jest.mock('npm:nodemailer@6.9.16', () => ({ __esModule: true, default: { createTransport: mockCreateTransport } }), { virtual: true });
jest.mock('npm:@supabase/supabase-js@2', () => ({ createClient: mockCreateClient }), { virtual: true });

const KEY = 'a'.repeat(64);
const env: Record<string, string | undefined> = {};
let handler: Handler;
let htmlOf: (text: string) => string;

beforeAll(() => {
  (globalThis as unknown as { Deno: unknown }).Deno = {
    env: { get: (k: string) => env[k] },
    serve: (h: Handler) => {
      handler = h;
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  htmlOf = require('../../supabase/functions/caa-mail/index.ts').htmlOf;
});
beforeEach(() => {
  mockSendMail.mockReset().mockResolvedValue({});
  mockRpc.mockReset();
  mockCreateTransport.mockClear();
  mockCreateClient.mockClear();
  Object.assign(env, {
    SMTP_USER: 'app@example.test',
    SMTP_PASS: 'app-password',
    MAIL_TO: 'team@example.test',
    SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    SUPABASE_SECRET_KEY: undefined,
    SMTP_HOST: undefined,
  });
});

const call = (headers: Record<string, string> = { 'x-mail-key': KEY }, method = 'POST') =>
  handler(new Request('https://abcdefghijklmnopqrst.supabase.co/functions/v1/caa-mail', { method, headers, body: method === 'POST' ? '{}' : undefined }));

describe('caa-mail: the postman of the team', () => {
  it('without the database’s key nothing happens: no question to the database, no e-mail', async () => {
    for (const headers of [{}, { 'x-mail-key': 'short' }, { 'x-mail-key': 'Z'.repeat(64) }, { authorization: `Bearer ${KEY}` }]) {
      const res = await call(headers as Record<string, string>);
      expect(res.status).toBe(401);
    }
    expect((await call(undefined, 'GET')).status).toBe(405);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('a key the database does not know is refused by the database', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'forbidden' } });
    const res = await call();
    expect(res.status).toBe(401);
    expect(mockRpc).toHaveBeenCalledWith('team_mail_take', { p_key: KEY });
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('sends each waiting message to the team’s address, through the app’s mailbox, and says so to the database', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        { id: 'm1', subject: 'Daleth AAC: a professional is waiting for verification', body: 'A professional sent their documents.\n\n- Profession: Speech-language therapist' },
        { id: 'm2', subject: 'Daleth AAC: figures of the week (7 Nov - 13 Nov)', body: 'ACCOUNTS\n- Parents in total: 12' },
      ],
      error: null,
    });
    mockRpc.mockResolvedValue({ data: null, error: null });
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 2, failed: 0 });
    expect(mockCreateTransport).toHaveBeenCalledWith({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: 'app@example.test', pass: 'app-password' } });
    expect(mockSendMail).toHaveBeenCalledTimes(2);
    for (const [mail] of mockSendMail.mock.calls) {
      // Always the team's address: nothing in the call can choose another one.
      expect(mail.to).toBe('team@example.test');
      expect(mail.from).toEqual({ name: 'Daleth AAC', address: 'app@example.test' });
      expect(mail.text.length).toBeGreaterThan(10);
      expect(mail.html).toContain('<li');
    }
    expect(mockRpc).toHaveBeenCalledWith('team_mail_done', { p_key: KEY, p_id: 'm1', p_error: null });
    expect(mockRpc).toHaveBeenCalledWith('team_mail_done', { p_key: KEY, p_id: 'm2', p_error: null });
  });

  it('a message the mailbox refuses is marked, and the others still leave', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ id: 'm1', subject: 's1', body: 'b1' }, { id: 'm2', subject: 's2', body: 'b2' }], error: null });
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockSendMail.mockRejectedValueOnce(new Error('Invalid login: 535 Username and Password not accepted'));
    const res = await call();
    expect(await res.json()).toEqual({ sent: 1, failed: 1 });
    expect(mockRpc).toHaveBeenCalledWith('team_mail_done', { p_key: KEY, p_id: 'm1', p_error: 'Invalid login: 535 Username and Password not accepted' });
    expect(mockRpc).toHaveBeenCalledWith('team_mail_done', { p_key: KEY, p_id: 'm2', p_error: null });
  });

  it('says "not configured" while a secret is missing, and sends to the mailbox itself when no other address is given', async () => {
    env.SMTP_PASS = undefined;
    expect((await call()).status).toBe(503);
    expect(mockRpc).not.toHaveBeenCalled();
    env.SMTP_PASS = 'app-password';
    env.MAIL_TO = undefined;
    mockRpc.mockResolvedValueOnce({ data: [{ id: 'm1', subject: 's', body: 'b' }], error: null }).mockResolvedValue({ data: null, error: null });
    await call();
    expect(mockSendMail.mock.calls[0][0].to).toBe('app@example.test');
  });

  it('uses the new server key first, the older one if the first is not accepted, and gives up cleanly without any', async () => {
    env.SUPABASE_SECRET_KEY = 'sb_secret_new';
    // The new key works: the old one is never tried.
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    expect((await call()).status).toBe(200);
    expect(mockCreateClient.mock.calls.map((c) => (c as unknown[])[1])).toEqual(['sb_secret_new']);
    // The new key is refused by the project: the old one is tried, and the message leaves.
    mockCreateClient.mockClear();
    mockRpc.mockReset();
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'Invalid API key' } })
      .mockResolvedValueOnce({ data: [{ id: 'm1', subject: 's', body: 'b' }], error: null })
      .mockResolvedValue({ data: null, error: null });
    expect(await (await call()).json()).toEqual({ sent: 1, failed: 0 });
    expect(mockCreateClient.mock.calls.map((c) => (c as unknown[])[1])).toEqual(['sb_secret_new', 'service-key']);
    // Neither is accepted: "unavailable", and nothing is sent.
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });
    mockSendMail.mockClear();
    expect((await call()).status).toBe(503);
    expect(mockSendMail).not.toHaveBeenCalled();
    // No server key at all: "not configured", the database is not even asked.
    env.SUPABASE_SECRET_KEY = undefined;
    env.SUPABASE_SERVICE_ROLE_KEY = undefined;
    mockRpc.mockReset();
    expect((await call()).status).toBe(503);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('nothing waiting: no connection to the mailbox at all', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    expect(await (await call()).json()).toEqual({ sent: 0, failed: 0 });
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });

  it('the page version of a message cannot carry code: everything is written as text', () => {
    const html = htmlOf('ACCOUNTS\n- Country: <img src=x onerror=alert(1)> & "co"\n\nPlain line');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;co&quot;');
    expect(html).toContain('<h3');
    expect(html).toContain('<p style="margin:8px 0">Plain line</p>');
  });
});
