/**
 * Payment screens (src/lib/billing.ts; the database decides). The family's subscription on the
 * Account page and in the message after the caregiver code; the professional's licence in her
 * workspace. Never on the board while the child talks: there, only a dot on "Settings" and
 * "Caregiver". Every purchase sheet is the store's own (src/lib/purchases.ts), behind the code.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { billingStrings, type BillingStrings } from '../i18n/billing';
import { changesBlocked, daysLeft, LEGAL_LINKS, laterKey, today, type BillingStatus, type MyBilling } from '../lib/billing';
import { outside } from '../lib/outside';
import { buy, manageSubscription, plans, purchasesAvailable, restore, startPurchases, type Plan } from '../lib/purchases';
import type { UiLang } from '../model/types';
import { useApp } from '../state/AppState';
import { useBoard } from '../state/BoardContext';
import { useSession } from '../state/Session';
import { Btn, Panel, Section, useNavRtl } from './common';
import { goOnAfterCode } from './panels/CommPanels';
import { C } from './theme';

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const dateOf = (ms: number | undefined, lang: UiLang) => (ms ? new Date(ms).toLocaleDateString(lang === 'ar' ? 'ar-LB' : lang) : '');

/** One sentence: where the family's board stands. */
export function statusText(b: BillingStrings, st: { status: BillingStatus; until?: number; renews?: boolean }, lang: UiLang, now = Date.now()): string {
  const n = daysLeft(st.until, now);
  switch (st.status) {
    case 'trial':
      return fill(b.status.trial, { n });
    case 'grace':
      return fill(b.status.grace, { n });
    case 'paused':
      return fill(b.status.paused, { n });
    case 'frozen':
      return b.status.frozen;
    case 'paid':
      return fill(st.renews ? b.status.paid : b.status.paidEnds, { date: dateOf(st.until, lang) });
    default:
      return b.status.free;
  }
}

function Line({ text, strong, tone }: { text: string; strong?: boolean; tone?: 'ok' | 'warn' }) {
  // Arabic menus read right to left (the board itself is never mirrored).
  const rtl = useNavRtl();
  return (
    <Text
      style={[
        styles.line,
        strong && { fontWeight: '700' },
        tone === 'ok' && { color: C.success },
        tone === 'warn' && { color: C.help },
        rtl && { textAlign: 'right', writingDirection: 'rtl' },
      ]}
    >
      {text}
    </Text>
  );
}

/**
 * What can be bought, the store's prices, buying and "Restore purchases", the stores' required
 * lines (renewal, terms, privacy). `kind`: the family's subscription or the professional's licence.
 * After a purchase the server reads the store's records again; `onChanged` then reads it back.
 */
export function Plans({ kind, onChanged }: { kind: 'family' | 'pro'; onChanged: () => void }) {
  const { api, account, uiLang } = useSession();
  const b = billingStrings(uiLang);
  const [list, setList] = useState<Plan[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const can = purchasesAvailable();
  useEffect(() => {
    if (!can || !account) return;
    let live = true;
    startPurchases(account.id)
      .then(() => plans(kind))
      .then((p) => live && setList(p))
      .catch(() => live && setList([]));
    return () => {
      live = false;
    };
  }, [can, account, kind]);
  const settle = useCallback(async () => {
    // What the store said is checked by the server (caa-billing) before anything changes.
    await api.billingRefresh().catch(() => {});
    onChanged();
  }, [api, onChanged]);
  if (!can) return <Line text={b.storesOnly} />;
  const doBuy = async (p: Plan) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await buy(p);
      if (r === 'bought') setMsg({ ok: true, text: b.bought });
      if (r === 'pending') setMsg({ ok: true, text: b.pending });
      if (r !== 'cancelled') await settle();
    } catch {
      setMsg({ ok: false, text: b.storeError });
    } finally {
      setBusy(false);
    }
  };
  const doRestore = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await restore();
      await settle();
      setMsg({ ok: true, text: b.restored });
    } catch {
      setMsg({ ok: false, text: b.storeError });
    } finally {
      setBusy(false);
    }
  };
  const priceLine = (p: Plan) => fill(p.period === 'month' ? b.perMonth : p.period === 'year' ? b.perYear : b.once, { price: p.price });
  const name = (p: Plan) => (p.id === 'familyMonthly' ? b.monthly : p.id === 'familyYearly' ? b.yearly : b.licence);
  const open = (url: string) => void outside(() => Linking.openURL(url)).catch(() => {});
  return (
    <View style={{ gap: 10 }}>
      {list === null && <Line text={b.checking} />}
      {list?.length === 0 && <Line text={b.noPlans} />}
      {list?.map((p) => (
        <View key={p.id} style={styles.plan}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={styles.planName}>{name(p)}</Text>
            <Text style={styles.line}>{priceLine(p)}</Text>
          </View>
          <Btn
            kind="primary"
            icon="check"
            label={kind === 'pro' ? b.buyLicence : b.subscribe}
            accessibilityLabel={`${kind === 'pro' ? b.buyLicence : b.subscribe}: ${name(p)}, ${priceLine(p)}`}
            disabled={busy}
            onPress={() => void doBuy(p)}
          />
        </View>
      ))}
      {msg && <Line text={msg.text} tone={msg.ok ? 'ok' : 'warn'} strong />}
      <Btn small icon="refresh" label={b.restore} disabled={busy} onPress={() => void doRestore()} />
      {kind === 'family' && <Text style={styles.small}>{b.renewsNote}</Text>}
      <View style={styles.links}>
        <Btn small kind="ghost" icon="external" label={b.terms} onPress={() => open(Platform.OS === 'ios' ? LEGAL_LINKS.termsApple : LEGAL_LINKS.terms)} />
        <Btn small kind="ghost" icon="external" label={b.privacy} onPress={() => open(LEGAL_LINKS.privacy)} />
      </View>
    </View>
  );
}

/** Account page: the family's subscription for the open child (the one who pays sees the plans). */
/** `fallback`: what shows while payment is not switched on. */
export function SubscriptionSection({ fallback }: { fallback?: React.ReactNode }) {
  const board = useBoard();
  const { api, uiLang } = useSession();
  const b = billingStrings(uiLang);
  const [mine, setMine] = useState<MyBilling | null>(null);
  // The stable function only (the context object is new at each render of the board).
  const refresh = board?.refreshBilling;
  const read = useCallback(() => {
    api.billingMine().then(setMine, () => {});
    refresh?.();
  }, [api, refresh]);
  useEffect(read, [read]);
  const st = board?.billing;
  // Payment not switched on: nothing about it (the stores are not open yet).
  if (!st?.live && !mine?.live) return <>{fallback ?? null}</>;
  const status = st?.status ?? (mine?.family && mine.family.until > Date.now() ? 'paid' : 'free');
  const payer = st ? st.payer : true;
  return (
    <Section title={b.subscription}>
      {st && <Line text={statusText(b, st, uiLang)} strong tone={status === 'paid' ? 'ok' : changesBlocked(status) ? 'warn' : undefined} />}
      {status !== 'paid' && <Line text={b.childStillTalks} />}
      {status === 'paused' && <Line text={b.pausedMeans} />}
      {status === 'frozen' && <Line text={b.frozenMeans} />}
      {!payer && <Line text={b.notPayer} />}
      {payer && status !== 'paid' && <Plans kind="family" onChanged={read} />}
      {payer && status === 'paid' && purchasesAvailable() && (
        <Btn small icon="settings" label={b.manage} onPress={() => void manageSubscription().catch(() => {})} />
      )}
    </Section>
  );
}

/** The professional's workspace: her licence. */
/** `fallback`: what shows while payment is not switched on. */
export function LicenceSection({ fallback }: { fallback?: React.ReactNode }) {
  const { api, uiLang } = useSession();
  const b = billingStrings(uiLang);
  const [mine, setMine] = useState<MyBilling | null>(null);
  const read = useCallback(() => void api.billingMine().then(setMine, () => {}), [api]);
  useEffect(read, [read]);
  if (!mine?.live) return fallback ?? null;
  return (
    <Section title={b.licencePay}>
      <Line text={b.licenceIntro} />
      {mine.pro ? (
        <Line text={b.licenceOwned} strong tone="ok" />
      ) : (
        <Plans kind="pro" onChanged={read} />
      )}
    </Section>
  );
}

/**
 * The message after the caregiver code (overlay `payment`). Free week or ended subscription:
 * "Later" goes on to what was asked. Paused or frozen: nothing that changes the board opens; the
 * child's board stays usable behind it, and "My account" stays reachable.
 */
export function PaymentPanel() {
  const app = useApp();
  const board = useBoard();
  const sess = useSession();
  const { uiLang } = sess;
  const b = billingStrings(uiLang);
  const then = app.overlay?.kind === 'payment' ? app.overlay.then : undefined;
  const st = board?.billing;
  if (!st) return null;
  const blocked = changesBlocked(st.status);
  const tablet = sess.account?.provider === 'device';
  const later = () => {
    if (board) void AsyncStorage.setItem(laterKey(board.profileId), today()).catch(() => {});
    goOnAfterCode(app, then);
  };
  return (
    <Panel title={b.messageTitle} onClose={() => app.setOverlay(null)} maxWidth={560} tone="edit">
      <Line text={statusText(b, st, uiLang)} strong tone={blocked ? 'warn' : undefined} />
      <Line text={b.childStillTalks} />
      {st.status === 'paused' && <Line text={b.pausedMeans} />}
      {st.status === 'frozen' && <Line text={b.frozenMeans} />}
      {st.payer ? <Plans kind="family" onChanged={() => board?.refreshBilling?.()} /> : <Line text={tablet ? b.notPayerTablet : b.notPayer} />}
      <View style={styles.links}>
        {!blocked && <Btn label={b.later} onPress={later} />}
        <Btn icon="user" label={b.myAccount} onPress={() => app.setOverlay({ kind: 'settings', tab: 'account', back: { kind: 'payment', then } })} />
      </View>
    </Panel>
  );
}

/** Was "Later" chosen today for this child on this device? */
export async function saidLaterToday(profileId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(laterKey(profileId))) === today();
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  line: { color: C.text, fontSize: 15, lineHeight: 21 },
  small: { color: C.textMuted, fontSize: 13, lineHeight: 18 },
  plan: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  planName: { color: C.text, fontSize: 16, fontWeight: '800' },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
