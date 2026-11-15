/**
 * A professional's own caregiver code.
 * A family's code lives in the child's profile and belongs to the family: a professional does
 * not know it. So that the adults' tools are still protected on a professional's device (a child
 * is often in front of it), she chooses her own code once; it is kept with her account and asked
 * on every board she opens. The accounts of the app's own team are never asked a code.
 */
import { useMemo } from 'react';
import type { OwnCode } from './AppState';
import { useSession } from './Session';

export function useOwnCode(): OwnCode | undefined {
  const { account, isAdmin, updatePrefs } = useSession();
  const pro = account?.role === 'pro' && !isAdmin;
  const value = account?.prefs.pin;
  return useMemo(() => (pro ? { value, save: (code: string) => void updatePrefs({ pin: code }) } : undefined), [pro, value, updatePrefs]);
}
