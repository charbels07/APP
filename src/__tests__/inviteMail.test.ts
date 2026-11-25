/** The invitation a parent sends from their own mail app, and the pause between two codes. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';
import { accountStrings, errorText } from '../i18n/account';
import { dataStrings } from '../i18n/data';
import { settingsStrings } from '../i18n/settings';
import { inviteMailLink, MAIL_SERVICES, mailLinks } from '../lib/inviteMail';
import { preset } from '../lib/permissions';

describe('the invitation e-mail', () => {
  it('opens the mail app with the address, the subject and the whole message', () => {
    const x = settingsStrings('en');
    const body = x.inviteMessage('Rita', 'Adam', 'MEW22JD5', 'Daleth AAC', 'https://app.example');
    const link = inviteMailLink('sarah@clinic.fr', x.inviteSubject('Adam', 'Daleth AAC'), body);
    expect(link.startsWith('mailto:sarah@clinic.fr?subject=')).toBe(true);
    const read = decodeURIComponent(link);
    expect(read).toContain('Rita invites you to join Adam’s team in the Daleth AAC app.');
    expect(read).toContain('https://app.example');
    expect(read).toContain('MEW22JD5');
    // line breaks survive (written as %0A in the link)
    expect(link).toContain('%0A');
  });
  it('never puts anything but a plain address in the link', () => {
    for (const bad of ['', undefined, 'not an address', 'a@b.fr?cc=x@y.z', 'a@b.fr,c@d.fr', 'a@b.fr&body=x']) {
      expect(inviteMailLink(bad, 's', 'b').startsWith('mailto:?subject=')).toBe(true);
    }
  });
  it('asks which mail service to use: each one opens a new message already written', () => {
    const x = settingsStrings('en');
    const body = x.inviteMessage('Rita', 'Adam', 'MEW22JD5', 'Daleth AAC', 'https://app.example');
    const subject = x.inviteSubject('Adam', 'Daleth AAC');
    expect(MAIL_SERVICES).toEqual(['gmail', 'outlook', 'yahoo', 'device']);
    const starts: Record<string, string> = {
      gmail: 'https://mail.google.com/mail/?view=cm&fs=1&to=sarah%40clinic.fr&su=',
      outlook: 'https://outlook.live.com/mail/0/deeplink/compose?to=sarah%40clinic.fr&subject=',
      yahoo: 'https://compose.mail.yahoo.com/?to=sarah%40clinic.fr&subject=',
      device: 'mailto:sarah@clinic.fr?subject=',
    };
    for (const service of MAIL_SERVICES) {
      const links = mailLinks(service, 'sarah@clinic.fr', subject, body);
      expect(links.web.startsWith(starts[service])).toBe(true);
      // The whole message travels in the link, line breaks included, in every service.
      for (const link of [links.web, links.app].filter(Boolean) as string[]) {
        const read = decodeURIComponent(link);
        expect(read).toContain('MEW22JD5');
        expect(read).toContain('Rita invites you to join Adam’s team');
        expect(link).toContain('%0A');
        expect(link).not.toContain(' ');
      }
      // The three languages have a name for it.
      for (const lang of ['fr', 'en', 'ar'] as const) expect(settingsStrings(lang).mailServices[service].length).toBeGreaterThan(3);
    }
    // On a tablet the service's own app is tried first; the device's mail app has no other link.
    expect(mailLinks('gmail', 'sarah@clinic.fr', subject, body).app!.startsWith('googlegmail://co?to=')).toBe(true);
    expect(mailLinks('device', 'sarah@clinic.fr', subject, body).app).toBeUndefined();
  });
  it('a strange address or text can never add something to a mail link', () => {
    for (const service of MAIL_SERVICES) {
      for (const bad of ['a@b.fr&bcc=x@y.z', 'a@b.fr?cc=x@y.z', 'not an address', 'a@b.fr,c@d.fr']) {
        const { web, app } = mailLinks(service, bad, 's&bcc=evil@x.y', 'b&cc=evil@x.y#frag');
        for (const link of [web, app].filter(Boolean) as string[]) {
          expect(link).not.toContain('evil@');
          expect(link).not.toContain('x@y.z');
          expect(link).not.toContain('c@d.fr');
          expect(link).not.toContain('#frag');
        }
      }
    }
  });
  it('the message exists in the three languages, with the code and where to type it', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const x = settingsStrings(lang);
      const msg = x.inviteMessage('Rita', 'Adam', 'MEW22JD5', 'Daleth AAC', '');
      expect(msg).toContain('MEW22JD5');
      expect(msg).toContain('Rita');
      expect(msg).not.toContain('undefined');
      expect(x.inviteShare.length).toBeGreaterThan(20);
    }
  });
});

describe('a professional types an invitation code', () => {
  const api = new LocalBackend();
  const code = async (p: Promise<{ demoCode?: string }>) => (await p).demoCode!;
  it('the same code a parent shares lets her join at once, with the rights the family chose', async () => {
    await AsyncStorage.clear();
    await api.verifyCode({ email: 'rita@example.com' }, await code(api.signUp({ role: 'parent', displayName: 'Rita', email: 'rita@example.com', password: 'secret123' })));
    const child = await api.createProfile({ name: 'Adam', age: 6, data: createDefaultProfile() });
    const inv = await api.invite(child.id, { email: 'someone-else@example.com', name: 'Bcba', role: 'therapist', ...preset('therapist') });
    await api.signOut();
    await api.verifyCode({ email: 'sarah@clinic.fr' }, await code(api.signUp({ role: 'pro', displayName: 'Sarah', email: 'sarah@clinic.fr', password: 'secret123' })));
    await api.saveVerification({ fullName: 'Sarah K', country: 'France', profession: 'slp', documents: [{ name: 'd.pdf', kind: 'diploma', uploadedAt: 1, ref: 'x' }, { name: 'p.jpg', kind: 'id', uploadedAt: 1, ref: 'y' }] });
    await api.submitVerification();
    await api.demoOpenBackOffice();
    const req = (await api.adminVerifications()).find((v) => v.email === 'sarah@clinic.fr')!;
    await api.adminDecideVerification(req.userId, 'verified');
    await api.signIn({ email: 'sarah@clinic.fr', password: 'secret123' });
    // The family's connection code is another kind of code: an invitation code is refused there…
    await expect(api.requestConnection(inv.code, { role: 'therapist', ...preset('therapist') })).rejects.toMatchObject({ code: 'code_invalid' });
    // …and accepted as an invitation.
    const joined = await api.acceptInvitationCode(inv.code);
    expect(joined.childName).toBe('Adam');
    expect((await api.listProfiles()).map((p) => [p.name, p.access, p.level])).toEqual([['Adam', 'therapist', 2]]);
  });
});

describe('small wordings', () => {
  it('"do not record data" replaces "nothing", and the pause between two codes has its own sentence', () => {
    expect(dataStrings('fr').levels.off).toBe('Ne pas enregistrer de données');
    expect(dataStrings('en').levels.off).toBe('Do not record any data');
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const s = accountStrings(lang);
      expect(errorText(s, { code: 'wait' })).not.toBe(s.errors.generic);
      expect(s.codeJunk.length).toBeGreaterThan(10);
      expect(s.codeWait.length).toBeGreaterThan(10);
    }
  });
});

describe('the code pasted from the e-mail', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { codeFrom } = require('../lib/codeInput') as typeof import('../lib/codeInput');
  it('is found whatever the mail app made of it', () => {
    expect(codeFrom('20883655')).toBe('20883655');
    expect(codeFrom('2088 3655')).toBe('20883655');
    expect(codeFrom('2088‌3655')).toBe('20883655'); // the invisible joiner of the new e-mail
    expect(codeFrom('tel:20883655')).toBe('20883655');
    expect(codeFrom('tel:+20883655')).toBe('20883655');
    expect(codeFrom('https://eur01.safelinks.example/?url=tel%3A20883655&data=05%7C02%7C')).toBe('20883655');
    expect(codeFrom('Your code: 123456.')).toBe('123456');
  });
  it('typing digit by digit still works', () => {
    expect(codeFrom('2')).toBe('2');
    expect(codeFrom('2088')).toBe('2088');
    expect(codeFrom('208836551234')).toBe('20883655');
    expect(codeFrom('')).toBe('');
  });
});
