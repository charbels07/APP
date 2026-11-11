/**
 * What the settings pages need to know about the open child's board: which profile,
 * the sync engine (status, history reasons) and this person's access to it.
 * Not provided in the preview and the set-up trial (no account, nothing saved).
 */
import { createContext, useContext } from 'react';
import type { AccessLevel, CollaboratorRole, PermissionSet } from '../lib/permissions';
import type { ProfileSync } from './profileSync';
import type { UsageTracker } from './usageTracker';

export interface MyAccess {
  owner: boolean;
  role: CollaboratorRole | 'owner';
  level: AccessLevel;
  perms: PermissionSet;
}

export interface BoardCtx {
  profileId: string;
  childName: string;
  sync: ProfileSync;
  /** null while unknown (offline). */
  access: MyAccess | null;
  /** Owner, or allowed to manage the team. */
  manager: boolean;
  /** Communication data recorder of this device (null until ready). */
  tracker?: UsageTracker | null;
}

export const BoardContext = createContext<BoardCtx | null>(null);
export const useBoard = () => useContext(BoardContext);
