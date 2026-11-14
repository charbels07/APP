/**
 * A professional prepares a child's profile before the family has an account, then gives the
 * parents a code: the profile becomes theirs (demo server; the same rules are tested on the real
 * database in supabase/tests/pro_profiles_scenario.sql).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendError } from '../backend/Backend';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';
import { forProfessional, onboardingStrings } from '../i18n/onboarding';
import { noticeText } from '../lib/notices';
import { preset } from '../lib/permissions';
import { emptyResource, sandboxFor } from '../lib/resources';
import { followsContent, materialTitle, resourceName } from '../lib/resourceNames';

const api = new LocalBackend();
const code = async (p: Promise<{ demoCode?: string }>) => (await p).demoCode!;
const expectCode = async (p: Promise<unknown>, c: string) => {
  await expect(p).rejects.toBeInstanceOf(BackendError);
  await expect(p).rejects.toMatchObject({ code: c });
};
const DOCS = [
  { name: 'diplome.pdf', kind: 'diploma' as const, uploadedAt: 1, ref: 'x' },
  { name: 'passeport.jpg', kind: 'id' as const, uploadedAt: 1, ref: 'y' },
];
const signUp = async (role: 'parent' | 'pro', displayName: string, email: string) => {
  const c = await code(api.signUp({ role, displayName, email, password: 'secret123' }));
  await api.verifyCode({ email }, c);
};

beforeAll(async () => {
  await AsyncStorage.clear();
});

describe('a professional creates a child’s profile, then the parents take it', () => {
  let adam = '';
  let parentsCode = '';

  it('not before the certificate is accepted', async () => {
    await signUp('pro', 'Sarah K.', 'sarah@clinic.fr');
    await expectCode(api.createProfile({ name: 'Adam', age: 6, data: createDefaultProfile() }), 'pro_not_verified');
    await api.saveVerification({ fullName: 'Sarah Khoury', country: 'France', profession: 'slp', documents: DOCS });
    await api.submitVerification();
    await api.demoOpenBackOffice();
    const req = (await api.adminVerifications()).find((v) => v.email === 'sarah@clinic.fr')!;
    await api.adminDecideVerification(req.userId, 'verified');
    await api.signIn({ email: 'sarah@clinic.fr', password: 'secret123' });
  });

  it('the profile starts with recording and sharing off, whatever was asked', async () => {
    const data = createDefaultProfile();
    data.settings.dataCollection = 'language';
    data.settings.shareStats = 'anonymous';
    const rec = await api.createProfile({ name: 'Adam', age: 6, data });
    adam = rec.id;
    expect(rec.data.settings.dataCollection).toBe('off');
    expect(rec.data.settings.shareStats).toBe('none');
    expect((await api.listProfiles()).map((p) => [p.name, p.access])).toEqual([['Adam', 'owner']]);
  });

  it('she prepares the board, but what is recorded stays the family’s decision', async () => {
    const cur = await api.getProfile(adam);
    const recording = { ...cur.data, settings: { ...cur.data.settings, dataCollection: 'usage' as const } };
    await expectCode(api.saveProfile(adam, recording, cur.version), 'consent_protected');
    const prepared = { ...cur.data, settings: { ...cur.data.settings, pin: '4821' } };
    expect((await api.saveProfile(adam, prepared, cur.version)).ok).toBe(true);
  });

  it('she makes the parents’ code; a new one replaces it', async () => {
    const first = await api.invite(adam, { role: 'parent', ...preset('parent') });
    await api.cancelInvitation(first.id);
    const inv = await api.invite(adam, { role: 'parent', ...preset('parent') });
    parentsCode = inv.code;
    expect(inv.code).not.toBe(first.code);
    const pending = (await api.profileInvitations(adam)).filter((i) => i.role === 'parent' && i.status === 'pending');
    expect(pending.map((i) => i.code)).toEqual([parentsCode]);
    await api.signOut();
  });

  it('the parent types the code and becomes the owner; the caregiver code is theirs to choose', async () => {
    await signUp('parent', 'Eve', 'eve@example.com');
    const inv = await api.acceptInvitationCode(parentsCode);
    expect(inv.profileId).toBe(adam);
    expect((await api.listProfiles()).map((p) => [p.name, p.access])).toEqual([['Adam', 'owner']]);
    const rec = await api.getProfile(adam);
    expect(rec.data.settings.pin).toBe('1234');
    // Recording is now the family's choice.
    const recording = { ...rec.data, settings: { ...rec.data.settings, dataCollection: 'usage' as const, pin: '7306' } };
    expect((await api.saveProfile(adam, recording, rec.version)).ok).toBe(true);
    const team = await api.listMembers(adam);
    expect(team.map((m) => [m.displayName, m.role, m.level, m.perms.manager, m.perms.viewData])).toEqual([['Sarah K.', 'therapist', 3, false, false]]);
    await api.signOut();
  });

  it('the professional stays in the team, is told about it, and no longer owns the profile', async () => {
    await api.signIn({ email: 'sarah@clinic.fr', password: 'secret123' });
    expect((await api.listProfiles()).map((p) => [p.name, p.access, p.level])).toEqual([['Adam', 'therapist', 3]]);
    const told = (await api.listNotices()).map((n) => n.text);
    expect(told.some((t) => noticeText(t, 'en') === 'Eve is now the parent in charge of Adam’s profile. You stay on the team.')).toBe(true);
    await expectCode(api.deleteProfile(adam), 'forbidden');
    const cur = await api.getProfile(adam);
    await expectCode(api.saveProfile(adam, { ...cur.data, settings: { ...cur.data.settings, dataCollection: 'off' as const } }, cur.version), 'consent_protected');
  });
});

describe('the set-up questions for a professional', () => {
  it('say "the child" instead of "your child", in the three languages', () => {
    for (const [lang, mine, theirs] of [
      ['fr', /otre enfant/, 'L’enfant'],
      ['en', /our child/, 'The child'],
      ['ar', /طفلك/, 'الطفل'],
    ] as const) {
      const o = forProfessional(onboardingStrings(lang), lang);
      expect(o.childTitle).toBe(theirs);
      expect(JSON.stringify(o)).not.toMatch(mine);
      // the family's own screens are unchanged
      expect(JSON.stringify(onboardingStrings(lang))).toMatch(mine);
    }
  });
});

describe('a material is called by what it contains', () => {
  it('an activity board takes the board’s own name; "Untitled" is not a name', () => {
    const data = emptyResource('tla');
    const sandbox = sandboxFor('tla', data);
    const concept = data.boards[0]?.concept;
    if (concept) {
      const name = materialTitle('tla', data, sandbox, 'en');
      expect(resourceName({ kind: 'tla', title: 'Untitled', data }, 'en')).toBe(name || 'Activity board (TLA)');
      expect(resourceName({ kind: 'tla', title: 'Sans titre', data }, 'en')).toBe(name || 'Activity board (TLA)');
    }
    expect(resourceName({ kind: 'tla', title: 'Dentist', data }, 'en')).toBe('Dentist');
    // "Untitled" follows the content; a name somebody typed does not.
    expect(followsContent({ kind: 'tla', title: 'Untitled', data })).toBe(true);
    expect(followsContent({ kind: 'tla', title: 'My own name for it', data })).toBe(false);
    const ft = { ...emptyResource('firstThen'), firstThen: { first: 'eat', then: 'play' } };
    const auto = materialTitle('firstThen', ft, undefined, 'fr');
    expect(auto).toContain(' → ');
    expect(followsContent({ kind: 'firstThen', title: auto, data: ft })).toBe(true);
    expect(resourceName({ kind: 'firstThen', title: 'Untitled', data: ft }, 'en')).toBe(materialTitle('firstThen', ft, undefined, 'en'));
    expect(resourceName({ kind: 'timer', title: '', data: { ...emptyResource('timer') } }, 'fr')).toMatch(/min|Minuteur/);
  });
});
