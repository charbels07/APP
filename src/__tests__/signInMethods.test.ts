/**
 * @jest-environment node
 *
 * The sign-in screen only offers Google, Apple or phone when the real server has them turned on:
 * a button must never lead to the server's raw error page.
 */
import { SupabaseBackend, providerName } from '../backend/supabase';

const server = (settings: unknown) => {
  const calls: string[] = [];
  const fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    if (settings === 'down') throw new Error('network');
    return { json: async () => settings } as Response;
  }) as typeof globalThis.fetch;
  return { api: new SupabaseBackend('https://example.supabase.co', 'public-key', { storageKey: `t-${Math.random()}`, fetch }), calls };
};

describe('sign-in methods offered by the real server', () => {
  it('reads what is turned on, once', async () => {
    const { api, calls } = server({ external: { email: true, google: true, apple: false, phone: false } });
    expect(await api.signInMethods()).toEqual({ google: true, apple: false, phone: false });
    await api.signInMethods();
    expect(calls).toEqual(['https://example.supabase.co/auth/v1/settings']);
  });

  it('refuses a method that is off before going anywhere', async () => {
    const { api, calls } = server({ external: { email: true, google: false, apple: false, phone: false } });
    await expect(api.signInWithProvider('google', 'parent')).rejects.toMatchObject({ code: 'provider_off' });
    expect(calls).toHaveLength(1); // only the question "what is turned on?"
  });

  it('offers e-mail only when the server cannot be asked, and asks again later', async () => {
    const { api, calls } = server('down');
    expect(await api.signInMethods()).toEqual({ google: false, apple: false, phone: false });
    await api.signInMethods();
    expect(calls).toHaveLength(2);
  });
});

describe('the name Google or Apple gives with the sign-in', () => {
  it('is read from what the provider sends, and nothing is invented', () => {
    expect(providerName({ full_name: ' Rita Haddad ', name: 'rita' })).toBe('Rita Haddad');
    expect(providerName({ name: 'Rita H.' })).toBe('Rita H.');
    expect(providerName({ role: 'parent', display_name: 'typed at sign-up' })).toBe('');
    expect(providerName({ full_name: 42 })).toBe('');
    expect(providerName(null)).toBe('');
  });
});
