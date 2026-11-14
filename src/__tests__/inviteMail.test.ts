/** The invitation a parent sends from their own mail app, and the pause between two codes. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';
import { accountStrings, errorText } from '../i18n/account';
import { dataStrings } from '../i18n/data';
import { settingsStrings } from '../i18n/settings';
import { inviteMailLink } from '../lib/inviteMail';
import { preset } from '../lib/permissions';

describe('the invitation e-mail', () => {
  it('opens the mail app with the address, the subject and the whole message', () => {
    const x = settingsStrings('en');
    const body = x.inviteMessage('Rita', 'Adam', 'MEW22JD5', 'Empower Communication', 'https://app.example');
    const link = inviteMailLink('sarah@clinic.fr', x.inviteSubject('Adam', 'Empower Communication'), body);
    expect(link.startsWith('mailto:sarah@clinic.fr?subject=')).toBe(true);
    const read = decodeURIComponent(link);
    expect(read).toContain('Rita invites you to join Adam’s team in the Empower Communication app.');
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
  it('the message exists in the three languages, with the code and where to type it', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const x = settingsStrings(lang);
      const msg = x.inviteMessage('Rita', 'Adam', 'MEW22JD5', 'Empower Communication', '');
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
