/** Back office → Security: what the nightly retention and the other protections leave (counts only). */
import React, { useEffect, useState } from 'react';
import type { AdminRetention } from '../../backend/Backend';
import { securityStrings } from '../../i18n/security';
import { useSession } from '../../state/Session';
import { ChartCard, StatGrid, StatTile } from '../data/Charts';

export function RetentionCard() {
  const { api, uiLang } = useSession();
  const t = securityStrings(uiLang);
  const [r, setR] = useState<AdminRetention | null>(null);
  useEffect(() => {
    // Needs the database update of November 2026; before it, nothing is shown.
    api.adminRetention().then(setR).catch(() => setR(null));
  }, [api]);
  if (!r) return null;
  return (
    <ChartCard title={t.retTitle} note={t.retNote}>
      <StatGrid>
        <StatTile label={t.retTeam} value={`${r.twoStepTeam} / ${r.team}`} />
        <StatTile label={t.retInactive} value={String(r.inactiveAccounts)} />
        <StatTile label={t.retBin} value={String(r.inBin)} />
        <StatTile label={t.retFiles} value={String(r.filesWaiting)} />
        <StatTile label={t.retConsents} value={String(r.consents)} />
      </StatGrid>
    </ChartCard>
  );
}
