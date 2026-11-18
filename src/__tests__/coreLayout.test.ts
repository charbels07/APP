/**
 * Release check: the places of the core words never move.
 *
 * A child finds a word by the movement of the hand, not by reading: positions are the child's motor
 * plan. The place of every word of the starter boards (src/data/defaults.ts: the main board and its
 * folders) and of the words every activity board carries (TLA_CORE, TLA_FUNCTIONS in
 * src/data/tlaCore.ts, placed by src/lib/boardOrder.ts) is written in
 * `fixtures/coreLayout.json`, committed with the app. This test fails if one of them moves or
 * disappears. A new word may be added in an empty slot: it does not move anything.
 *
 * Changing a place on purpose (a layout validated by the speech-language therapist, before a
 * release) is a decision, not a fix: rewrite the fixture with
 *   UPDATE_CORE_LAYOUT=1 npx jest src/__tests__/coreLayout.test.ts
 * and say in the commit why the child's motor plan changes.
 *
 * Saved profiles: `migrate` (src/lib/storage.ts) must never move a card of a family's board
 * (checked with `fixtures/oldProfile.json`, a profile as an older version saved it).
 */
import fs from 'fs';
import path from 'path';
import { APPS_FOLDER_SLOT, createDefaultProfile, TLA_CORE, TLA_FUNCTIONS } from '../data/defaults';
import { migrate } from '../lib/storage';
import type { Board, Profile } from '../model/types';

const FIXTURE = path.join(__dirname, 'fixtures', 'coreLayout.json');

/** [row, column], counted from 0. */
type Place = [number, number];

interface BoardLayout {
  rows: number;
  cols: number;
  /** Each word → its places on the board (a word can be there twice). */
  words: Record<string, Place[]>;
  /** Each folder card → the board it opens. */
  folders: Record<string, string>;
}

interface CoreLayout {
  /** The starter boards: the main board and its folders. */
  boards: Record<string, BoardLayout>;
  /** The words every activity board carries, in their order. */
  tlaCore: string[][];
  tlaFunctions: string[];
  /** Where those words are on each starter activity board. */
  activityBoards: Record<string, Record<string, Place[]>>;
}

function placesOf(board: Board, only?: Set<string>): Record<string, Place[]> {
  const out: Record<string, Place[]> = {};
  board.cells.forEach((cell, i) => {
    if (!cell || (only && !only.has(cell.concept))) return;
    (out[cell.concept] ??= []).push([Math.floor(i / board.cols), i % board.cols]);
  });
  return out;
}

function layoutOf(profile: Profile): CoreLayout {
  const boards: Record<string, BoardLayout> = {};
  const activityBoards: Record<string, Record<string, Place[]>> = {};
  const fixed = new Set([...TLA_CORE.flat(), ...TLA_FUNCTIONS]);
  for (const [id, b] of Object.entries(profile.boards)) {
    if (b.kind === 'tla') {
      activityBoards[id] = placesOf(b, fixed);
      continue;
    }
    const folders: Record<string, string> = {};
    for (const cell of b.cells) if (cell?.folder) folders[cell.concept] = cell.folder;
    boards[id] = { rows: b.rows, cols: b.cols, words: placesOf(b), folders };
  }
  return { boards, tlaCore: TLA_CORE, tlaFunctions: TLA_FUNCTIONS, activityBoards };
}

const where = (p: Place | undefined) => (p ? `row ${p[0] + 1}, column ${p[1] + 1}` : 'nowhere (removed)');
const MOTOR_PLAN = 'positions are the child’s motor plan';

/** Every word recorded must still be at each of its places. */
function moved(boardName: string, recorded: Record<string, Place[]>, now: Record<string, Place[]>): string[] {
  const problems: string[] = [];
  for (const [word, places] of Object.entries(recorded)) {
    const current = now[word] ?? [];
    places.forEach((p, k) => {
      if (!current.some((c) => c[0] === p[0] && c[1] === p[1]))
        problems.push(`core word "${word}" on ${boardName} moved from ${where(p)} to ${where(current[k] ?? current[0])}: ${MOTOR_PLAN}`);
    });
  }
  return problems;
}

describe('core layout (release check)', () => {
  const current = layoutOf(createDefaultProfile());

  if (process.env.UPDATE_CORE_LAYOUT === '1') {
    it('rewrites the recorded layout (asked on purpose)', () => {
      fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
      // One line per word: [row, column] pairs.
      const text = JSON.stringify(current, null, 1)
        .replace(/\[\s*(\d+),\s*(\d+)\s*\]/g, '[$1, $2]')
        .replace(/\[\s*(\[\d+, \d+\](?:,\s*\[\d+, \d+\])*)\s*\]/g, (_, inner: string) => `[${inner.replace(/,\s+\[/g, ', [')}]`);
      fs.writeFileSync(FIXTURE, `${text}\n`);
    });
    return;
  }

  const recorded = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as CoreLayout;

  it('every word of the starter boards is where it was recorded', () => {
    const problems: string[] = [];
    for (const [id, rec] of Object.entries(recorded.boards)) {
      const now = current.boards[id];
      if (!now) {
        problems.push(`board "${id}" was removed: ${MOTOR_PLAN}`);
        continue;
      }
      if (now.cols !== rec.cols || now.rows !== rec.rows)
        problems.push(`board "${id}" changed size from ${rec.rows}×${rec.cols} to ${now.rows}×${now.cols}: every word moves, ${MOTOR_PLAN}`);
      problems.push(...moved(`board "${id}"`, rec.words, now.words));
      for (const [card, opens] of Object.entries(rec.folders))
        if (now.folders[card] !== opens) problems.push(`folder "${card}" on board "${id}" opened "${opens}", now "${now.folders[card] ?? 'nothing'}": ${MOTOR_PLAN}`);
    }
    expect(problems).toEqual([]);
  });

  it('the words every activity board carries keep their order and their places', () => {
    expect({ tlaCore: current.tlaCore, tlaFunctions: current.tlaFunctions }).toEqual({ tlaCore: recorded.tlaCore, tlaFunctions: recorded.tlaFunctions });
    const problems: string[] = [];
    for (const [id, rec] of Object.entries(recorded.activityBoards)) {
      const now = current.activityBoards[id];
      if (!now) continue; // a starter activity board may be retired; its words are checked on the others
      problems.push(...moved(`activity board "${id}"`, rec, now));
    }
    expect(problems).toEqual([]);
  });

  it('the apps folder sits in the slot kept for it', () => {
    const core = createDefaultProfile().boards.core;
    expect(core.cells[APPS_FOLDER_SLOT]?.folder).toBe('apps');
  });

  it('says clearly which word moved and where', () => {
    const rec = { want: [[1, 0]] as Place[] };
    expect(moved('board "core"', rec, { want: [[2, 0]] })).toEqual([
      `core word "want" on board "core" moved from row 2, column 1 to row 3, column 1: ${MOTOR_PLAN}`,
    ]);
    expect(moved('board "core"', rec, {})[0]).toContain('to nowhere (removed)');
  });
});

describe('saved profiles: migrate never moves a card', () => {
  const OLD = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'oldProfile.json'), 'utf8')) as Partial<Profile>;

  /** Every card of every board of `before` is at the same place, with the same folder, in `after`. */
  function expectSameCards(before: Partial<Profile>, after: Profile) {
    const problems: string[] = [];
    for (const [id, b] of Object.entries(before.boards ?? {})) {
      const a = after.boards[id];
      if (!a) {
        problems.push(`board "${id}" disappeared`);
        continue;
      }
      if (a.rows !== b.rows || a.cols !== b.cols) problems.push(`board "${id}" changed size`);
      b.cells.forEach((cell, i) => {
        if (!cell) return;
        const now = a.cells[i];
        if (now?.concept !== cell.concept || now?.folder !== cell.folder)
          problems.push(`"${cell.concept}" on board "${id}" was at slot ${i}, migrate put "${now?.concept ?? 'nothing'}" there`);
      });
    }
    expect(problems).toEqual([]);
  }

  it('an old profile keeps every card where the family put it', () => {
    const before = structuredClone(OLD);
    const after = migrate(structuredClone(OLD));
    expectSameCards(before, after);
    // The family's own layout is not the starter one: the test really looks at it.
    expect(before.boards!.core.cells[0]?.concept).not.toBe(createDefaultProfile().boards.core.cells[0]?.concept);
  });

  it('only fills an empty slot: the apps folder goes into the free slot of an old profile, never over a card', () => {
    const after = migrate(structuredClone(OLD));
    expect(OLD.boards!.core.cells[APPS_FOLDER_SLOT]).toBeNull();
    expect(after.boards.core.cells[APPS_FOLDER_SLOT]?.folder).toBe('apps');
    const taken = structuredClone(OLD);
    taken.boards!.core.cells[APPS_FOLDER_SLOT] = { concept: 'ball' };
    expect(migrate(taken).boards.core.cells[APPS_FOLDER_SLOT]?.concept).toBe('ball');
  });

  it('running it again changes nothing', () => {
    const once = migrate(structuredClone(OLD));
    const twice = migrate(structuredClone(once));
    expect(twice.boards).toEqual(once.boards);
  });

  it('a profile saved by this version comes back with the same cards', () => {
    const p = createDefaultProfile();
    // A family's changes: two words swapped, a word removed, one added in a free slot.
    const core = p.boards.core.cells;
    [core[0], core[1]] = [core[1], core[0]];
    core[2] = null;
    core[71] = { concept: 'ball' };
    const saved = JSON.parse(JSON.stringify(p)) as Profile;
    expectSameCards(saved, migrate(saved));
  });
});
