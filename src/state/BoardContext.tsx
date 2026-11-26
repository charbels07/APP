/**
 * What the settings pages need to know about the open child's board: which profile,
 * the sync engine (status, history reasons) and this person's access to it.
 * Not provided in the preview and the set-up trial (no account, nothing saved).
 */
import { createContext, useContext } from 'react';
import type { BoardBilling } from '../backend/Backend';
import type { AccessLevel, CollaboratorRole, PermissionSet } from '../lib/permissions';
import type { MediaSync } from './mediaSync';
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
  /** Copies of the child's photos and recordings through the account (null until ready). */
  media?: MediaSync | null;
  /** Where the family's payment stands (src/lib/billing.ts); undefined until the server answered. */
  billing?: BoardBilling | null;
  /** Asks the server again (after a purchase, when the Account page opens). */
  refreshBilling?: () => void;
}

export const BoardContext = createContext<BoardCtx | null>(null);
export const useBoard = () => useContext(BoardContext);

/**
 * A child's board opened by a professional in the workspace: a draft compared with the child's
 * profile (no sync engine). The settings pages then show what a professional may see: the team,
 * the follow-up if the family allows it, and their own account.
 */
export interface ProBoardCtx {
  profileId: string;
  childName: string;
  access: MyAccess;
}

export const ProBoardContext = createContext<ProBoardCtx | null>(null);
export const useProBoard = () => useContext(ProBoardContext);
