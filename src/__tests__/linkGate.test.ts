/**
 * Links out of the app behind the caregiver code (store rules for children's apps: a parental gate
 * before another app or a web page opens from the board).
 */
import fs from 'fs';
import path from 'path';
import { linkNeedsCode } from '../lib/appLinks';
import { opensAlone } from '../lib/caregiverCode';
import { strings } from '../i18n/ui';

const src = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('when the caregiver code is asked before leaving the board', () => {
  it('on the tablet apps, always for the child', () => {
    for (const os of ['ios', 'android']) expect(linkNeedsCode({ os, freeEdit: false, caregiver: false })).toBe(true);
  });
  it('not in caregiver mode (the code was just typed), never for the app’s own team', () => {
    expect(linkNeedsCode({ os: 'ios', freeEdit: false, caregiver: true })).toBe(false);
    expect(linkNeedsCode({ os: 'android', freeEdit: true, caregiver: false })).toBe(false);
  });
  it('in a browser, as before (the banner waits for a tap on "Open")', () => {
    expect(linkNeedsCode({ os: 'web', freeEdit: false, caregiver: false })).toBe(false);
  });
});

describe('the board asks for it', () => {
  const app = src('state/AppState.tsx');
  const launch = app.slice(app.indexOf('const launchApp = useCallback'), app.indexOf('useEffect(() => () => clearTimeout(launchTimer.current)'));

  it('an app pictogram: the code first, before any countdown', () => {
    const gate = launch.indexOf('linkNeedsCode(');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(launch.indexOf('APPS_NEED_TAP'));
    expect(gate).toBeLessThan(launch.indexOf('setTimeout('));
    expect(launch).toMatch(/kind: 'pin', then: \{ kind: 'openLink'/);
  });

  it('the keypad opens the link after the right code, without turning caregiver mode on', () => {
    expect(opensAlone({ kind: 'openLink' })).toBe(true);
    const pin = src('ui/panels/CommPanels.tsx');
    // What the right code opens lives in goOnAfterCode (also "Later" under the subscription's message).
    const open = pin.slice(pin.indexOf('export function goOnAfterCode'), pin.indexOf('export function PinPanel'));
    expect(pin.slice(pin.indexOf('const open = () => {'), pin.indexOf('const again ='))).toContain('goOnAfterCode(app, then)');
    expect(open.indexOf("then?.kind === 'openLink'")).toBeGreaterThan(-1);
    expect(open.indexOf('openAppUrl(then.url)')).toBeLessThan(open.indexOf('setEditMode(true)'));
    // One sentence says another app is about to open.
    expect(pin).toContain('t.pinOpensApp');
  });

  it('the team’s accounts open it without a code', () => {
    const set = app.slice(app.indexOf('const setOverlay = useCallback'), app.indexOf('const [stripState'));
    expect(set).toMatch(/freeEditRef\.current\)[\s\S]*then\?\.kind === 'openLink'[\s\S]*openAppUrl/);
  });

  it('the websites of the credits in the guide (open to the child) go through it too', () => {
    expect(src('ui/panels/GuidePanel.tsx')).toMatch(/<PictoCredit [^>]*onLink=\{\(url\) => app\.openLink\(/);
  });

  it('the sentence exists in the three languages, with the app’s name', () => {
    for (const l of ['fr', 'en', 'ar'] as const) expect(strings(l).pinOpensApp).toContain('{name}');
  });
});
