/** Switch scanning (Settings → Touch): the rules of the highlight, the switches and the board's rows. */
import {
  boardRows,
  HELP_ID,
  cardId,
  cardIndex,
  chooseStep,
  keyAction,
  litIds,
  nextStep,
  scanGroups,
  scanOf,
  screenAction,
  spokenId,
  startScan,
  type ScanRules,
  type ScanState,
} from '../lib/scanning';

const ROWS = [
  ['a:speak', 'a:delete'],
  ['c:0', 'c:1', 'c:2'],
  ['c:3', 'c:4'],
];
const AUTO: ScanRules = { mode: 'auto', loops: 2 };
const STEP: ScanRules = { mode: 'step', loops: 2 };

/** Moves `n` steps. */
const go = (s: ScanState, groups: string[][], rules: ScanRules, n: number) => {
  for (let i = 0; i < n; i++) s = nextStep(s, groups, rules);
  return s;
};

describe('scanning: settings', () => {
  it('is off unless chosen, and keeps values within bounds (they may come from another device)', () => {
    expect(scanOf({}).mode).toBe('off');
    expect(scanOf({ scan: undefined })).toEqual({ mode: 'off', pattern: 'rows', speed: 1.5, loops: 3, speak: false, screen: false });
    const odd = scanOf({ scan: { mode: 'auto', pattern: 'cards', speed: 99, loops: -4, speak: true, screen: true } });
    expect(odd).toEqual({ mode: 'auto', pattern: 'cards', speed: 5, loops: 1, speak: true, screen: true });
    expect(scanOf({ scan: { mode: 'evil', speed: NaN } as never })).toMatchObject({ mode: 'off', speed: 1.5 });
  });
});

describe('scanning: row, then card', () => {
  const groups = scanGroups(ROWS, 'rows');

  it('starts on the first row, lit as a whole, and goes down the rows', () => {
    const s = startScan(groups);
    expect(litIds(s, groups)).toEqual(['a:speak', 'a:delete']);
    expect(litIds(nextStep(s, groups, AUTO), groups)).toEqual(['c:0', 'c:1', 'c:2']);
    expect(litIds(go(s, groups, AUTO, 2), groups)).toEqual(['c:3', 'c:4']);
  });

  it('enters a row, then goes card by card in it', () => {
    let s = nextStep(startScan(groups), groups, AUTO);
    const r = chooseStep(s, groups);
    expect(r.chosen).toBeUndefined();
    s = r.state;
    expect(s.level).toBe('items');
    expect(litIds(s, groups)).toEqual(['c:0']);
    s = nextStep(s, groups, AUTO);
    expect(litIds(s, groups)).toEqual(['c:1']);
    const chosen = chooseStep(s, groups);
    expect(chosen.chosen).toBe('c:1');
    // After a choice the scan starts again from the top.
    expect(chosen.state).toEqual(startScan(groups));
  });

  it('automatic: a row entered by mistake is left after its turns (the same row lit again)', () => {
    let s = chooseStep(go(startScan(groups), groups, AUTO, 2), groups).state; // in the last row: c:3, c:4
    s = go(s, groups, AUTO, 3); // c:4, c:3, c:4
    expect(s.level).toBe('items');
    s = nextStep(s, groups, AUTO); // two turns done
    expect(s.level).toBe('rows');
    expect(litIds(s, groups)).toEqual(['c:3', 'c:4']);
  });

  it('automatic: stops after its turns over the rows, and the next press only starts it again', () => {
    let s = startScan(groups);
    s = go(s, groups, AUTO, 3 * 2 - 1);
    expect(s.waiting).toBe(false);
    s = nextStep(s, groups, AUTO);
    expect(s.waiting).toBe(true);
    expect(litIds(s, groups)).toEqual([]);
    // The timer does nothing while waiting.
    expect(nextStep(s, groups, AUTO)).toBe(s);
    const r = chooseStep(s, groups);
    expect(r.chosen).toBeUndefined();
    expect(r.state).toEqual(startScan(groups));
  });

  it('step by step: never stops, and after the last card of a row goes back to the rows', () => {
    let s = go(startScan(groups), groups, STEP, 30);
    expect(s.waiting).toBe(false);
    s = chooseStep(startScan(groups), groups).state; // in the first row: Speak, Delete
    s = go(s, groups, STEP, 2);
    expect(s.level).toBe('rows');
    expect(litIds(nextStep(s, groups, STEP), groups)).toEqual(['c:0', 'c:1', 'c:2']);
  });

  it('a row with a single card chooses it at once', () => {
    const g = scanGroups([['a:back'], ['c:0', 'c:1']], 'rows');
    const r = chooseStep(startScan(g), g);
    expect(r.chosen).toBe('a:back');
  });

  it('one row only: no row to choose first', () => {
    const g = scanGroups([[], ['c:0', 'c:1']], 'rows');
    expect(g).toEqual([['c:0', 'c:1']]);
    expect(startScan(g).level).toBe('items');
    expect(litIds(startScan(g), g)).toEqual(['c:0']);
  });
});

describe('scanning: card by card', () => {
  const groups = scanGroups(ROWS, 'cards');

  it('goes over every item in the order seen on screen', () => {
    expect(groups).toEqual([['a:speak', 'a:delete', 'c:0', 'c:1', 'c:2', 'c:3', 'c:4']]);
    let s = startScan(groups);
    const seen: string[] = [];
    for (let i = 0; i < 7; i++) {
      seen.push(...litIds(s, groups));
      s = nextStep(s, groups, AUTO);
    }
    expect(seen).toEqual(groups[0]);
    expect(litIds(s, groups)).toEqual(['a:speak']);
  });

  it('automatic: stops after its turns; step by step: loops on', () => {
    expect(go(startScan(groups), groups, AUTO, 7 * 2).waiting).toBe(true);
    expect(go(startScan(groups), groups, AUTO, 7 * 2 - 1).waiting).toBe(false);
    expect(go(startScan(groups), groups, STEP, 7 * 5).waiting).toBe(false);
  });

  it('chooses the lit item', () => {
    const s = go(startScan(groups), groups, STEP, 4);
    expect(chooseStep(s, groups).chosen).toBe('c:2');
  });

  it('auditory scanning says the lit item, or the first one of a lit row', () => {
    expect(spokenId(go(startScan(groups), groups, AUTO, 2), groups)).toBe('c:0');
    const rows = scanGroups(ROWS, 'rows');
    expect(spokenId(nextStep(startScan(rows), rows, AUTO), rows)).toBe('c:0');
  });

  it('nothing to scan: nothing lit, nothing chosen', () => {
    const s = startScan([]);
    expect(litIds(s, [])).toEqual([]);
    expect(nextStep(s, [], AUTO)).toBe(s);
    expect(chooseStep(s, []).chosen).toBeUndefined();
  });
});

describe('scanning: the switches', () => {
  it('automatic: Space, Enter (and 1, 2) choose; other keys do nothing', () => {
    for (const k of [' ', 'Enter', '1', '2']) expect(keyAction(k, 'auto')).toBe('choose');
    for (const k of ['Tab', 'Escape', 'a', 'ArrowRight']) expect(keyAction(k, 'auto')).toBeNull();
  });

  it('step by step: Space (1, an arrow) moves, Enter (2) chooses', () => {
    for (const k of [' ', '1', 'ArrowRight', 'ArrowDown']) expect(keyAction(k, 'step')).toBe('next');
    for (const k of ['Enter', '2']) expect(keyAction(k, 'step')).toBe('choose');
    expect(keyAction('Tab', 'step')).toBeNull();
  });

  it('the whole screen: a touch chooses; step by step, the left half moves and the right half chooses', () => {
    expect(screenAction(10, 800, 'auto')).toBe('choose');
    expect(screenAction(790, 800, 'auto')).toBe('choose');
    expect(screenAction(10, 800, 'step')).toBe('next');
    expect(screenAction(790, 800, 'step')).toBe('choose');
  });
});

describe('scanning: the rows of a board', () => {
  it('groups the cards drawn by row on screen, left to right, whatever their index', () => {
    // A board of 4 columns; with the words packed up (part of the words shown) a card's place differs from its index.
    const rows = boardRows(
      [
        { index: 9, slot: 1 },
        { index: 0, slot: 0 },
        { index: 6, slot: 5 },
        { index: 3, slot: 3 },
        { index: 13, slot: 12 },
      ],
      4,
    );
    expect(rows).toEqual([['c:0', 'c:9', 'c:3'], ['c:6'], ['c:13']]);
  });

  it('names a card by its index', () => {
    expect(cardId(12)).toBe('c:12');
    expect(cardIndex('c:12')).toBe(12);
    expect(cardIndex('a:speak')).toBeNull();
  });
});

describe('scanning: Help, the one button of the bar in the scan', () => {
  // As the Scanner builds it: the sentence's buttons, the board's rows, then Help.
  const withHelp = [...ROWS, [HELP_ID]];

  it('row, then card: Help is lit after the last row, and one press asks for help', () => {
    const groups = scanGroups(withHelp, 'rows');
    const onHelp = go(startScan(groups), groups, AUTO, groups.length - 1);
    expect(litIds(onHelp, groups)).toEqual([HELP_ID]);
    expect(chooseStep(onHelp, groups).chosen).toBe(HELP_ID);
  });

  it('card by card: Help comes after the last card', () => {
    const groups = scanGroups(withHelp, 'cards');
    const all = groups[0];
    expect(all[all.length - 1]).toBe(HELP_ID);
    const onHelp = go(startScan(groups), groups, STEP, all.length - 1);
    expect(chooseStep(onHelp, groups).chosen).toBe(HELP_ID);
  });

  it('the Scanner scans it on every board, says its name, and nothing else of the bar', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const scanner = fs.readFileSync(path.join(__dirname, '../ui/Scanner.tsx'), 'utf8');
    expect(scanner).toContain('...grid.rows, [HELP_ID]]');
    expect(scanner).toContain('if (id === HELP_ID) app.pressHelp();');
    expect(scanner).toContain('id === HELP_ID ? words.help');
    const bar = fs.readFileSync(path.join(__dirname, '../ui/UniversalBar.tsx'), 'utf8');
    expect(bar).toContain("useScanned(id === 'help' ? HELP_ID : '')");
    expect(scanner.match(/'a:[a-z]+'/g)?.every((id) => ["'a:delete'", "'a:speak'", "'a:back'"].includes(id))).toBe(true);
  });
});
