/**
 * Who may do what on a child's AAC profile (UX backlog §6 and the professional side).
 *
 * Three levels:
 *  1 — Use: use the board and model; no changes.
 *  2 — Contribute: every change becomes a proposal the parent approves.
 *  3 — Authorised editing: changes apply directly, except core-vocabulary positions,
 *      which always go through a proposal (they are the child's motor plan).
 * Each role starts from a preset; the parent can adjust the switches for each person.
 * The database enforces the same rules (supabase/migrations).
 */
import type { Profile } from '../model/types';
import type { Op } from './profileDiff';

export type CollaboratorRole = 'parent' | 'therapist' | 'teacher' | 'caregiver' | 'family' | 'other' | 'device';
export type AccessLevel = 1 | 2 | 3;

export interface PermissionSet {
  /** Create or adapt activity boards (TLA), schedules, First–Then. */
  createMaterials: boolean;
  /** Add or change words, pictures and categories. */
  proposeVocabulary: boolean;
  /** Change access and voice settings. */
  changeAccess: boolean;
  /** Invite other collaborators. */
  invite: boolean;
  /** Add and revoke devices. */
  manageDevices: boolean;
  /** Acts as a parent / guardian (co-parent, or the child's own tablet at home). */
  manager: boolean;
}

const NONE: PermissionSet = {
  createMaterials: false,
  proposeVocabulary: false,
  changeAccess: false,
  invite: false,
  manageDevices: false,
  manager: false,
};

/** Suggested starting points; the parent narrows or widens them for each person. */
export const ROLE_PRESETS: Record<CollaboratorRole, { level: AccessLevel; perms: PermissionSet }> = {
  parent: { level: 3, perms: { createMaterials: true, proposeVocabulary: true, changeAccess: true, invite: true, manageDevices: true, manager: true } },
  therapist: { level: 2, perms: { ...NONE, createMaterials: true, proposeVocabulary: true } },
  teacher: { level: 1, perms: { ...NONE } },
  caregiver: { level: 1, perms: { ...NONE } },
  family: { level: 1, perms: { ...NONE } },
  other: { level: 1, perms: { ...NONE } },
  device: { level: 1, perms: { ...NONE } },
};

export function preset(role: CollaboratorRole): { level: AccessLevel; perms: PermissionSet } {
  const p = ROLE_PRESETS[role];
  return { level: p.level, perms: { ...p.perms } };
}

/** What a change touches: decides which switch allows it. */
export type ChangeArea = 'core' | 'vocabulary' | 'materials' | 'settings';

export function areaOf(op: Op, base: Profile): ChangeArea {
  const [kind, id] = op.path;
  if (kind === 'cell') return id === 'core' ? 'core' : base.boards[String(id)]?.kind === 'tla' ? 'materials' : 'vocabulary';
  if (kind === 'board') {
    if (id === 'core') return 'core';
    const kindOf = ((op.after ?? op.before) as { kind?: string } | undefined)?.kind;
    return kindOf === 'tla' ? 'materials' : 'vocabulary';
  }
  if (kind === 'concept' || kind === 'override') return 'vocabulary';
  if (kind === 'setting') return 'settings';
  return 'materials'; // schedule, tlaOrder, firstThen
}

function allowedArea(area: ChangeArea, perms: PermissionSet): boolean {
  if (area === 'materials') return perms.createMaterials;
  if (area === 'settings') return perms.changeAccess;
  return perms.proposeVocabulary;
}

/**
 * Splits a person's changes into: applied directly, sent for approval, not allowed.
 * Owners and managers (parents) apply everything directly.
 */
export function classifyOps(
  ops: Op[],
  access: { owner?: boolean; level: AccessLevel; perms: PermissionSet },
  base: Profile,
): { direct: Op[]; approval: Op[]; forbidden: Op[] } {
  const out = { direct: [] as Op[], approval: [] as Op[], forbidden: [] as Op[] };
  for (const op of ops) {
    if (access.owner || access.perms.manager) {
      out.direct.push(op);
      continue;
    }
    const area = areaOf(op, base);
    if (access.level === 1 || !allowedArea(area, access.perms)) out.forbidden.push(op);
    else if (access.level === 2 || area === 'core') out.approval.push(op);
    else out.direct.push(op);
  }
  return out;
}

/** May this person open the editing tools (directly or as proposals)? */
export function canPrepareChanges(access: { owner?: boolean; level: AccessLevel; perms: PermissionSet }): boolean {
  if (access.owner || access.perms.manager) return true;
  return access.level >= 2 && (access.perms.createMaterials || access.perms.proposeVocabulary || access.perms.changeAccess);
}
