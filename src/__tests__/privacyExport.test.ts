/** The parent's consent kept with the profile, and "Download all my data" (demo server, as privacy_scenario.sql). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendError } from '../backend/Backend';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';
import { CHILD_DATA_CONSENT, consentText } from '../lib/consent';

describe('consent and the full export', () => {
  const api = new LocalBackend();
  afterEach(() => jest.restoreAllMocks());

  it('the consent text exists in the three languages, with its version', () => {
    expect(CHILD_DATA_CONSENT).toBeGreaterThan(0);
    for (const l of ['fr', 'en', 'ar'] as const) {
      expect(consentText[l].text.length).toBeGreaterThan(100);
      expect(consentText[l].tick).toBeTruthy();
    }
  });

  it('keeps the consent with the child, and the export holds the account, the child and the consent', async () => {
    await AsyncStorage.clear();
    const c = (await api.signUp({ role: 'parent', displayName: 'Mona', email: 'mona@example.com', password: 'secret123' })).demoCode!;
    await api.verifyCode({ email: 'mona@example.com' }, c);
    const rec = await api.createProfile({ name: 'Ziad', age: 4, data: createDefaultProfile(), consent: CHILD_DATA_CONSENT });
    const out = (await api.exportMyData()) as { account: { email: string }; children: { id: string }[]; consents: { profileId: string; version: number }[] };
    expect(out.account.email).toBe('mona@example.com');
    expect(out.children.map((x) => x.id)).toEqual([rec.id]);
    expect(out.consents).toEqual([expect.objectContaining({ profileId: rec.id, version: CHILD_DATA_CONSENT })]);
  });

  it('asks a fresh proof first', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 3_600_000);
    await expect(api.exportMyData()).rejects.toMatchObject({ code: 'proof_needed' });
    await expect(api.exportMyData()).rejects.toBeInstanceOf(BackendError);
  });
});
