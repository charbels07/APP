/**
 * The start of the app (gap review of November 2026, batch 1): the child's board opens from the
 * device, with or without the server, and is only erased when the server said clearly that
 * nobody is signed in.
 */
import fs from 'fs';
import path from 'path';
import { BackendError } from '../backend/Backend';
import type { Account } from '../backend/types';
import { DEFAULT_PREFS } from '../backend/types';
import { localBoard, whoIsSignedIn } from '../state/Session';

const account = (prefs: Partial<Account['prefs']> = {}): Account => ({
  id: 'u1',
  role: 'parent',
  displayName: 'Maman',
  provider: 'email',
  verified: true,
  createdAt: 1,
  prefs: { ...DEFAULT_PREFS, ...prefs },
});
const never = () => new Promise<Account | null>(() => {});

describe('who is signed in', () => {
  it('the server answers: its answer, whatever this device remembers', async () => {
    const fresh = account({ activeProfileId: 'p2' });
    expect(await whoIsSignedIn({ currentAccount: async () => fresh }, account())).toEqual({ account: fresh, unknown: false });
    expect(await whoIsSignedIn({ currentAccount: async () => null }, account())).toEqual({ account: null, unknown: false });
  });

  it('the server cannot be asked: the remembered account, never "nobody"', async () => {
    const offline = async () => {
      throw new BackendError('offline');
    };
    const mine = account();
    expect(await whoIsSignedIn({ currentAccount: offline }, mine)).toEqual({ account: mine, unknown: true });
    // Nothing remembered: unknown, and nothing is erased for it (the welcome page).
    expect(await whoIsSignedIn({ currentAccount: offline }, undefined)).toEqual({ account: null, unknown: true });
  });

  it('a slow server does not keep a known device waiting; its answer is handled when it comes', async () => {
    const mine = account();
    const fresh = account({ activeProfileId: 'p9' });
    let answer: (a: Account | null) => void = () => {};
    const api = { currentAccount: () => new Promise<Account | null>((r) => (answer = r)) };
    const started = Date.now();
    const r = await whoIsSignedIn(api, mine, 30);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(r.account).toBe(mine);
    expect(r.unknown).toBe(true);
    answer(fresh);
    expect(await r.later).toBe(fresh);
  });

  it('a device that remembers nobody waits for the answer (there is no board to open meanwhile)', async () => {
    let done = false;
    void whoIsSignedIn({ currentAccount: never }, undefined, 10).then(() => (done = true));
    await new Promise((r) => setTimeout(r, 40));
    expect(done).toBe(false);
  });
});

describe('the board this device opens by itself', () => {
  it('the one that was open last, when its copy is here', () => {
    expect(localBoard({ localOwner: 'u1', localProfiles: ['a', 'b'], lastProfile: 'b' }, account({ activeProfileId: 'a' }))).toBe('b');
  });
  it('else the account\'s, else the first child kept here (someone who joined by invitation never chose one)', () => {
    expect(localBoard({ localOwner: 'u1', localProfiles: ['a', 'b'] }, account({ activeProfileId: 'b' }))).toBe('b');
    expect(localBoard({ localOwner: 'u1', localProfiles: ['a', 'b'] }, account())).toBe('a');
    expect(localBoard({ localOwner: 'u1', localProfiles: ['a'], lastProfile: 'gone' }, account({ activeProfileId: 'also-gone' }))).toBe('a');
    // A device set up before the owner was written down: the remembered account is the owner.
    expect(localBoard({ account: account(), localProfiles: ['a'] }, account())).toBe('a');
  });
  it('never a copy another account left on this device (a session that ended with changes not sent)', () => {
    const left = { localOwner: 'someone-else', localProfiles: ['their-child'], lastProfile: 'their-child' };
    expect(localBoard(left, account())).toBeUndefined();
    expect(localBoard(left, account({ activeProfileId: 'mine' }))).toBe('mine');
    expect(localBoard({ localProfiles: ['their-child'] }, account())).toBeUndefined();
  });
  it('nothing kept here: what the account remembers, or nothing', () => {
    expect(localBoard({ localProfiles: [] }, account({ activeProfileId: 'x' }))).toBe('x');
    expect(localBoard(null, account())).toBeUndefined();
  });
});

describe('the screens keep these rules', () => {
  const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

  it('"Back" on the first step of "Add a child" returns to where it was opened from, and only an account without any child leaves', () => {
    const setup = read('ui/onboarding/Onboarding.tsx');
    const leave = setup.slice(setup.indexOf('const leave = () => {'), setup.indexOf('const back = () =>'));
    expect(leave).toContain('if (cameFrom) return sess.go(cameFrom);');
    // Signing out erases the boards kept on the device: never as the way out of a failed request.
    expect(leave).not.toMatch(/catch\([^)]*\)\s*=>\s*sess\.signOut/);
    expect(read('ui/settings/AccountTab.tsx')).toContain("sess.go({ name: 'onboarding', back: { name: 'board', profileId: board.profileId } })");
  });

  it('a route that fails opens the board kept on the device, whatever the failure', () => {
    const session = read('state/Session.tsx');
    const route = session.slice(session.indexOf('const route = useCallback('), session.indexOf('// The board on screen is the one this device opens again by itself.'));
    expect(route).toContain('const id = localBoard(deviceRef.current, a);');
    expect(route).not.toContain("e.code === 'offline'");
  });

  it('the family\'s code field is shown only to who may choose it', () => {
    const settings = read('ui/panels/CaregiverPanels.tsx');
    expect(settings).toContain('{(!board || board.manager || !!app.ownCode) && (');
  });

  it('"as soon as it touches": a finger that stays does nothing more', () => {
    const grid = read('ui/Grid.tsx');
    expect(grid).toContain("onLongPress={land || p.access === 'press' ? undefined :");
  });

  it('the credits page of a board is a panel of the board, beside the bar', () => {
    const root = read('ui/Root.tsx');
    expect(root).toContain('<CreditsHost.Provider value={setCredits}>');
    expect(root).toContain('{credits && <PictoCreditsPanel');
    const credits = read('ui/PictoCredits.tsx');
    expect(credits).toContain('{!host && (');
  });
});
