/**
 * Gap review, batch 2: what a child can reach.
 * The rules of the caregiver code and of caregiver mode (src/lib/caregiverCode.ts), the system
 * screens that do not count as leaving the app (src/lib/outside.ts) and the settings waiting for
 * "Save" (src/lib/settingsPatch.ts). The screens that use them are tried in a real browser.
 */
import fs from 'fs';
import path from 'path';
import { createDefaultProfile } from '../data/defaults';
import { GUIDE } from '../data/guide';
import { strings } from '../i18n/ui';
import { codeAccepted, codeOf, familyCodeUnset, IDLE_MS, idleTooLong, isAdultPanel, keypadStart, lastTouchAt, mayChooseCode, mustChooseFirst, opensAlone, pinPause, pinTooEasy, provesBeforeChoosing, showsCodeField, touched } from '../lib/caregiverCode';
import type { Settings } from '../model/types';
import { isOutside, outside, resetOutside, waitsElsewhere } from '../lib/outside';
import { applyPatch, changedKeys, isEmptyPatch, nextPatch, withPatch } from '../lib/settingsPatch';

describe('"1234" is "not chosen yet", never a code', () => {
  it('a new profile has no code', () => {
    const p = createDefaultProfile();
    expect(familyCodeUnset(p.settings.pin)).toBe(true);
    expect(familyCodeUnset('4821')).toBe(false);
    // A missing or damaged value is "not chosen" too, never an open door.
    for (const bad of [undefined, null, '', '12', 'abcd', '12345']) expect(familyCodeUnset(bad)).toBe(true);
  });

  it('while nothing is chosen, no code opens caregiver mode: not 1234, not anything', () => {
    const state = codeOf(undefined, '1234');
    expect(state.unset).toBe(true);
    for (const typed of ['1234', '0000', '', '4821']) expect(codeAccepted(typed, state)).toBe(false);
    // Once chosen, only that code.
    const chosen = codeOf(undefined, '4821');
    expect(codeAccepted('4821', chosen)).toBe(true);
    expect(codeAccepted('1234', chosen)).toBe(false);
  });

  it('a device that may not choose the code gets no keypad while there is no code', () => {
    // A linked "use only" tablet, a grandparent's account, or a parent whose rights have not arrived (offline).
    const cannot = mayChooseCode({ own: false, family: true, manager: false });
    expect(cannot).toBe(false);
    expect(keypadStart({ unset: true, canChoose: cannot })).toBe('notChosen');
    // Who decides for the child chooses now.
    expect(keypadStart({ unset: true, canChoose: mayChooseCode({ own: false, family: true, manager: true }) })).toBe('choose');
    // With a code, everyone gets the keypad.
    expect(keypadStart({ unset: false, canChoose: false })).toBe('enter');
    // The try-it preview and the set-up's trial have no account behind the board: it is the person's own.
    expect(mayChooseCode({ own: false, family: false, manager: false })).toBe(true);
  });

  it('the sentence shown instead of the keypad exists in the three languages and names no code', () => {
    for (const l of ['fr', 'en', 'ar'] as const) {
      expect(strings(l).pinNotChosen.length).toBeGreaterThan(40);
      expect(strings(l).pinNotChosen).not.toMatch(/1234/);
    }
  });
});

describe('a professional is asked her own code, never the family’s', () => {
  it('her code is the one compared, whatever the family’s profile holds', () => {
    const hers = codeOf({ value: '7305' }, '4821');
    expect(hers).toEqual({ pin: '7305', unset: false });
    // The family's code, which is in the profile she received, opens nothing on her device.
    expect(codeAccepted('4821', hers)).toBe(false);
    expect(codeAccepted('7305', hers)).toBe(true);
  });

  it('before she has chosen hers, the family’s code still opens nothing: she chooses her own', () => {
    const none = codeOf({ value: undefined }, '4821');
    expect(none.unset).toBe(true);
    expect(codeAccepted('4821', none)).toBe(false);
    expect(keypadStart({ unset: none.unset, canChoose: mayChooseCode({ own: true, family: false, manager: false }) })).toBe('choose');
  });
});

describe('the first "choose a code" keypad of a family’s board', () => {
  // `fresh`: the first opening after the set-up (the guide is still waiting to open).
  const parent = { family: true, manager: true, own: false, team: false, device: false, fresh: true, pin: '1234' };

  it('comes by itself at the first opening, for who decides for the child, while no code is chosen', () => {
    expect(mustChooseFirst(parent)).toBe(true);
    expect(mustChooseFirst({ ...parent, pin: '4821' })).toBe(false);
  });

  it('never covers a board already in use: the child may be the one opening it', () => {
    // A family that never chose a code, the parent's account signed in on the child's tablet.
    expect(mustChooseFirst({ ...parent, fresh: false })).toBe(false);
    // There, the code is chosen from "Caregiver", once the account has proved who is choosing.
    const later = { family: true, own: false, team: false, first: false };
    expect(provesBeforeChoosing(later)).toBe(true);
    expect(keypadStart({ unset: true, canChoose: true, proofFirst: provesBeforeChoosing(later) })).toBe('prove');
    // Not at the first opening (the adult who made the board is there), not on the try-it preview or
    // the set-up's trial, not for a professional's own code, not for the app's team.
    expect(provesBeforeChoosing({ ...later, first: true })).toBe(false);
    expect(provesBeforeChoosing({ ...later, family: false })).toBe(false);
    expect(provesBeforeChoosing({ ...later, own: true })).toBe(false);
    expect(provesBeforeChoosing({ ...later, team: true })).toBe(false);
    // With a code, the keypad as always; who may not choose still gets the sentence.
    expect(keypadStart({ unset: false, canChoose: true, proofFirst: true })).toBe('enter');
    expect(keypadStart({ unset: true, canChoose: false, proofFirst: true })).toBe('notChosen');
  });

  it('a tablet linked with a code never chooses the family’s code, even with full access', () => {
    // It has the parents' rights in the account, but it is the child's and can prove nothing.
    expect(mayChooseCode({ own: false, family: true, manager: true, device: true })).toBe(false);
    expect(keypadStart({ unset: true, canChoose: false })).toBe('notChosen');
    expect(mayChooseCode({ own: false, family: true, manager: true, device: false })).toBe(true);
  });

  it('waits for the rights: unknown rights (no internet yet) show no keypad, and it comes when they arrive', () => {
    expect(mustChooseFirst({ ...parent, manager: false })).toBe(false);
  });

  it('never on the child’s linked tablet, for the app’s team, on a professional’s board or on the try-it preview', () => {
    expect(mustChooseFirst({ ...parent, device: true })).toBe(false);
    expect(mustChooseFirst({ ...parent, team: true })).toBe(false);
    expect(mustChooseFirst({ ...parent, own: true })).toBe(false);
    expect(mustChooseFirst({ ...parent, family: false })).toBe(false);
  });
});

describe('wrong codes: the pauses stay as they were', () => {
  it('5 tries, then 30 s, 1, 2 and 5 minutes', () => {
    expect([1, 4, 5, 6, 7, 8, 20].map(pinPause)).toEqual([0, 0, 30000, 60000, 120000, 300000, 300000]);
  });
  it('the codes refused when one is chosen stay the same', () => {
    for (const easy of ['1234', '0000', '1111', '9999']) expect(pinTooEasy(easy)).toBe(true);
    for (const fine of ['4821', '1235', '1122']) expect(pinTooEasy(fine)).toBe(false);
  });
});

describe('caregiver mode turns itself off', () => {
  it('after 5 minutes without a touch', () => {
    expect(IDLE_MS).toBe(5 * 60 * 1000);
    expect(idleTooLong(1000, 1000 + IDLE_MS - 1)).toBe(false);
    expect(idleTooLong(1000, 1000 + IDLE_MS)).toBe(true);
  });

  it('a touch, a key or a letter typed in a field starts the 5 minutes again', () => {
    const before = lastTouchAt();
    const now = jest.spyOn(Date, 'now').mockReturnValue(before + 4 * 60 * 1000);
    touched();
    expect(lastTouchAt()).toBe(before + 4 * 60 * 1000);
    now.mockRestore();
    // The shared text field counts typing (a tablet's own keyboard sends nothing else to the app).
    expect(fs.readFileSync(path.join(__dirname, '..', 'ui/common.tsx'), 'utf8')).toMatch(/onChangeText=\{\(v\) => \{\s*touched\(\);/);
  });

  it('the adults’ panels close with it, the child’s stay', () => {
    for (const kind of ['settings', 'lock', 'print', 'editor', 'cellMenu', 'tlaMenu', 'shareTla', 'moveToTla', 'conceptEditor', 'scheduleEditor', 'newTla', 'newSequence', 'wordBin'])
      expect(isAdultPanel({ kind })).toBe(true);
    for (const kind of ['help', 'search', 'keyboard', 'guide', 'peek', 'pin', 'model', 'picker']) expect(isAdultPanel({ kind })).toBe(false);
    expect(isAdultPanel(null)).toBe(false);
  });

  it('a panel opened after the code, or whose "Back" leads to the settings, is the adults’ too', () => {
    // The timer's word picker once the code was typed for "Create a new word".
    expect(isAdultPanel({ kind: 'picker', adult: true })).toBe(true);
    expect(isAdultPanel({ kind: 'model', adult: true })).toBe(true);
    // The guide opened from Settings → Account: "Back" would return to the settings.
    expect(isAdultPanel({ kind: 'guide', back: { kind: 'settings' } })).toBe(true);
    expect(isAdultPanel({ kind: 'guide', back: { kind: 'help' } })).toBe(false);
  });

  it('a system screen the app opened itself (camera, share sheet, permission question) is not "leaving"', async () => {
    resetOutside();
    expect(isOutside()).toBe(false);
    let done!: (v: string) => void;
    const photo = outside(() => new Promise<string>((r) => (done = r)));
    // The camera is on screen: the app is in the background on Android, caregiver mode stays.
    expect(isOutside()).toBe(true);
    done('photo.jpg');
    await expect(photo).resolves.toBe('photo.jpg');
    // A moment after (some sheets appear once the call has answered), then no longer.
    expect(isOutside(Date.now() + 1000)).toBe(true);
    expect(isOutside(Date.now() + 5000)).toBe(false);
  });

  it('a screen waiting for a code the person reads elsewhere (mailbox, authenticator app) is not closed by leaving', () => {
    resetOutside();
    const gone = waitsElsewhere();
    expect(isOutside()).toBe(true);
    // The 5 minutes without a touch still end caregiver mode on the way back: that rule is not this one.
    expect(isOutside(Date.now() + 60 * 60 * 1000)).toBe(true);
    gone();
    gone();
    expect(isOutside(Date.now() + 5000)).toBe(false);
    // The screens that wait this way.
    const src = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    expect(src('ui/ProveItsYou.tsx')).toContain('useEffect(() => waitsElsewhere(), []);');
    expect(src('ui/TwoStep.tsx')).toContain('useEffect(() => (waiting ? waitsElsewhere() : undefined), [waiting]);');
  });

  it('left on the camera for a long time is leaving all the same, and a failed call frees the hold', async () => {
    resetOutside();
    let fail!: (e: Error) => void;
    const p = outside(() => new Promise<string>((_, r) => (fail = r)));
    expect(isOutside(Date.now() + 4 * 60 * 1000)).toBe(false);
    fail(new Error('cancelled'));
    await expect(p).rejects.toThrow('cancelled');
    expect(isOutside(Date.now() + 5000)).toBe(false);
  });
});

describe('after the code: what opens, and how', () => {
  it('the settings, the lock, the guide, a link, a new word for the timer and the demonstrations open without caregiver mode', () => {
    for (const kind of ['settings', 'lock', 'guide', 'openLink', 'picker', 'model', 'recordDemo']) expect(opensAlone({ kind })).toBe(true);
    // A new activity board and printing happen in caregiver mode.
    for (const kind of ['newTla', 'print']) expect(opensAlone({ kind })).toBe(false);
    expect(opensAlone(undefined)).toBe(false);
  });
});

describe('settings waiting for "Save"', () => {
  const base = () => createDefaultProfile().settings;

  it('nothing changed: what is shown is the profile itself', () => {
    const s = base();
    expect(withPatch(s, {})).toBe(s);
    expect(isEmptyPatch(s, {})).toBe(true);
  });

  it('a change is shown on top of the profile and saved alone', () => {
    const s = base();
    const patch = nextPatch(s, {}, (d) => void (d.speechRate = 1.3));
    expect(Object.keys(patch)).toEqual(['speechRate']);
    expect(withPatch(s, patch).speechRate).toBe(1.3);
    expect(s.speechRate).not.toBe(1.3);
  });

  it('"Save" does not put back an older value of what the person did not touch (a consent withdrawn elsewhere stays withdrawn)', () => {
    // The parent opens the settings while recording is on, and changes the voice speed…
    const opened: Settings = { ...base(), dataCollection: 'language' };
    const patch = nextPatch(opened, {}, (d) => void (d.speechRate = 1.2));
    // …meanwhile the other parent turns recording off on another device.
    const now: Settings = { ...opened, dataCollection: 'off' };
    expect(withPatch(now, patch).dataCollection).toBe('off');
    const saved = structuredClone(now);
    applyPatch(saved, patch);
    expect(saved.dataCollection).toBe('off');
    expect(saved.speechRate).toBe(1.2);
  });

  it('changed and changed back: nothing waits', () => {
    const s = base();
    let patch = nextPatch(s, {}, (d) => void (d.showLabels = !d.showLabels));
    expect(isEmptyPatch(s, patch)).toBe(false);
    patch = nextPatch(s, patch, (d) => void (d.showLabels = !d.showLabels));
    expect(isEmptyPatch(s, patch)).toBe(true);
    expect(changedKeys(s, patch)).toEqual([]);
  });

  it('several changes add up, also inside a group (the bar)', () => {
    const s = base();
    let patch = nextPatch(s, {}, (d) => void (d.bar.timer = !d.bar.timer));
    patch = nextPatch(s, patch, (d) => void (d.revealLevel = 2));
    const shown = withPatch(s, patch);
    expect(shown.bar.timer).toBe(!s.bar.timer);
    expect(shown.bar.tla).toBe(s.bar.tla);
    expect(shown.revealLevel).toBe(2);
    expect(changedKeys(s, patch).sort()).toEqual(['bar', 'revealLevel']);
  });

  it('the caregiver code and the menus’ language never travel through the list', () => {
    const s = base();
    const patch = nextPatch(s, {}, (d) => {
      d.pin = '9999';
      d.uiLang = 'ar';
      d.speechRate = 0.8;
    });
    expect(Object.keys(patch)).toEqual(['speechRate']);
    const saved = structuredClone(s);
    applyPatch(saved, { ...patch, pin: '9999' });
    expect(saved.pin).toBe(s.pin);
  });

  it('the Help button’s texts wait the same way', () => {
    const help = createDefaultProfile().help;
    const patch = nextPatch(help, {}, (h) => void (h.emergencyContact = 'Maman 03 123 456'));
    expect(Object.keys(patch)).toEqual(['emergencyContact']);
    expect(withPatch(help, patch).message).toEqual(help.message);
  });

  it('a list kept from before still shows on a profile that changed meanwhile', () => {
    // Caregiver mode turned itself off with unsaved changes; the settings open again later.
    const s = base();
    const kept = nextPatch(s, {}, (d) => void (d.quickZone = !d.quickZone));
    const later = { ...s, speechRate: 1.5 };
    const shown = withPatch(later, kept);
    expect(shown.quickZone).toBe(!s.quickZone);
    expect(shown.speechRate).toBe(1.5);
  });
});

describe('the guide says what changed', () => {
  const chapter = (id: string) => GUIDE.find((c) => c.id === id)!;
  it('the first keypad cannot be closed; caregiver mode closes by itself', () => {
    const c = chapter('caregiver');
    expect(c.steps.en.join(' ')).toMatch(/cannot be closed/);
    expect(c.steps.en.join(' ')).toMatch(/5 minutes without a touch/);
    expect(c.steps.fr.join(' ')).toMatch(/ne se ferme pas/);
    expect(c.steps.fr.join(' ')).toMatch(/5 minutes sans toucher/);
    expect(c.steps.ar.join(' ')).toMatch(/5 دقائق/);
  });
  it('a new word from the timer and a demonstration ask the code', () => {
    for (const l of ['fr', 'en', 'ar'] as const) {
      const t = strings(l);
      expect(chapter('timer').steps[l].join(' ')).toContain(t.createWord);
      expect(chapter('model').steps[l].join(' ')).toContain(t.recordDemo);
    }
    expect(chapter('timer').steps.en.join(' ')).toMatch(/caregiver code/);
    expect(chapter('model').steps.en.join(' ')).toMatch(/code is asked first/);
  });
});

describe('the screens keep these rules', () => {
  const src = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const pin = src('ui/panels/CommPanels.tsx');

  it('the keypad compares through the rule, never with a code written in the screen', () => {
    expect(pin).toContain('codeAccepted(next, { pin, unset })');
    expect(pin).not.toMatch(/'1234'/);
    expect(src('ui/Stages.tsx')).not.toMatch(/'1234'/);
    expect(src('ui/panels/CaregiverPanels.tsx')).not.toMatch(/'1234'/);
  });

  it('the first keypad of a family’s board has no cross and no Escape, and is drawn by the board itself', () => {
    expect(pin).toContain('onClose={first ? undefined : close}');
    const root = src('ui/Root.tsx');
    expect(root).toContain('{chooseFirst && <PinPanel first />}');
    // A panel opened from the bar (Help) shows instead; the scan does not run under the keypad.
    expect(root).toContain('<Scanner paused={chooseFirst} />');
    // The guide of a new board no longer opens around it after 4 seconds without the rights.
    const stages = src('ui/Stages.tsx');
    expect(stages).toContain('if (!familyCodeUnset(latest.current.profile.settings.pin)) start();');
    expect(stages).toContain('askAccess();');
  });

  it('during a pause the countdown is shown, not "Wrong code"', () => {
    expect(pin).toMatch(/const hint = waiting\s*\?\s*t\.pinLocked/);
    expect(pin).toContain('return again(pause ? null : t.pinWrong);');
  });

  it('"Forgot the code?" chooses again without proof only on the try-it preview', () => {
    const forgot = pin.slice(pin.indexOf('const startForgot'), pin.indexOf('const confirmed'));
    expect(forgot).toContain("if (app.preview) return setStep('choose');");
    expect(forgot).not.toContain('!board');
  });

  it('the timer’s picture: choosing a word is open, creating one asks the code', () => {
    const picker = src('ui/panels/CaregiverPanels.tsx');
    expect(picker).toContain('<Btn icon="plus" label={t.createWord} onPress={startCreating} />');
    expect(picker).toContain("app.setOverlay({ kind: 'pin', then: { ...here, adult: true, create: true }, back: here });");
    expect(picker).toContain('const adult = app.editMode || app.freeEdit || !!here?.adult;');
  });

  it('"Write to model": recording a demonstration and deleting one ask the code', () => {
    const model = src('ui/panels/ModelPanel.tsx');
    expect(model).toContain("then: { kind: 'recordDemo' }");
    expect(model).toContain("if (!adult) return app.setOverlay({ kind: 'pin', then: { kind: 'model', adult: true");
    expect(model).not.toContain('onPress={app.startRecording}');
  });

  it('a professional’s board always gets her own code, and "Settings" always goes through it', () => {
    const board = src('ui/pro/SandboxBoard.tsx');
    expect(board).toContain('ownCode={ownCode}');
    expect(board).not.toContain('canPrepareChanges(access) ? ownCode');
    expect(board).toContain("<StartAt overlay={{ kind: 'pin', then: { kind: 'settings' } }}");
    expect(board).not.toMatch(/: \{ kind: 'settings' \}\} onStarted/);
  });

  it('the family’s code is never shown on a child’s board opened from a professional’s workspace', () => {
    // The app's team has no code of its own there: without this rule the family's code was in the field.
    expect(showsCodeField({ own: false, proBoard: true, family: false, manager: false })).toBe(false);
    expect(showsCodeField({ own: true, proBoard: true, family: false, manager: false })).toBe(true);
  });

  it('the guide’s "Try it" keeps the way back and leads to the panel that was asked', () => {
    const guide = src('ui/panels/GuidePanel.tsx');
    expect(guide).toContain("return app.setOverlay(editMode ? target : { kind: 'pin', then: target, back: here });");
    expect(guide).toContain("return app.setOverlay({ kind: action, back: here });");
    expect(guide).not.toContain("app.setOverlay({ kind: 'pin' })");
  });

  it('caregiver mode turns itself off where a code brings the person back', () => {
    const app = src('state/AppState.tsx');
    expect(app).toContain('const guarded = adultOpen && !freeEdit && !staysOpen && !codeOf(ownCode, profile.settings.pin).unset;');
    expect(app).toContain("if (st === 'background' && !isOutside()) leave();");
    expect(app).toContain('if (idleTooLong(lastTouchAt(), Date.now())) leave();');
    // The camera, the photo library, the share and print sheets and the permission questions are marked.
    expect(src('lib/photos.ts')).toContain('outside(() => (source ===');
    expect(src('lib/platform.ts')).not.toContain('await Sharing.shareAsync(');
    expect(src('ui/panels/Recorder.tsx')).toContain('outside(() => requestRecordingPermissionsAsync())');
  });

  it('the settings’ unsaved changes are kept outside the panel, and "Reset" drops them', () => {
    const settings = src('ui/panels/CaregiverPanels.tsx');
    expect(settings).toContain('settingsStash.current = changed ? patch : null;');
    // "Save" and "Leave without saving" empty it at once: the panel often closes in the same instant.
    const hook = settings.slice(settings.indexOf('export function useSettingsDraft'), settings.indexOf('// ── Searching the settings'));
    expect(hook.match(/settingsStash\.current = null;/g)?.length).toBe(2);
    expect(settings).toContain('applyPatch(d.settings, patch.settings);');
    const app = src('state/AppState.tsx');
    expect(app.slice(app.indexOf('const replaceProfile'), app.indexOf('const lang ='))).toContain('settingsStash.current = null;');
  });
});
