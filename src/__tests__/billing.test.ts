/**
 * Payment (src/lib/billing.ts): the free week, the 7 days after a subscription ends, days 8–14
 * paused, then frozen with the child still talking; the message after the caregiver code; the demo
 * server follows the database (the same attacks: supabase/tests/billing_scenario.sql).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';
import { BackendError } from '../backend/Backend';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';
import { billingStrings } from '../i18n/billing';
import { afterCodeStop, billingStatus, changesBlocked, daysLeft, remindsToPay } from '../lib/billing';
import { CHILD_DATA_CONSENT } from '../lib/consent';
import { preset } from '../lib/permissions';

const DAY = 24 * 3600 * 1000;
const NOW = Date.UTC(2026, 11, 1);
const base = { live: true, liveSince: NOW - 100 * DAY, accountCreated: NOW, now: NOW };

describe('the rule', () => {
  it('blocks nothing while payment is off, nor on a professional’s own draft', () => {
    expect(billingStatus({ ...base, live: false, accountCreated: NOW - 400 * DAY }).status).toBe('free');
    expect(billingStatus({ ...base, proOwned: true, accountCreated: NOW - 400 * DAY }).status).toBe('free');
  });

  it('gives a free week from the account’s creation, then pauses, then freezes', () => {
    const at = (d: number) => billingStatus({ ...base, accountCreated: NOW - d * DAY }).status;
    expect(at(0)).toBe('trial');
    expect(at(6.9)).toBe('trial');
    expect(at(7)).toBe('paused');
    expect(at(13.9)).toBe('paused');
    expect(at(14)).toBe('frozen');
    expect(at(400)).toBe('frozen');
  });

  it('starts the free week of families already there on the day payment is switched on', () => {
    const s = billingStatus({ ...base, accountCreated: NOW - 300 * DAY, liveSince: NOW - 2 * DAY });
    expect(s.status).toBe('trial');
    expect(daysLeft(s.until, NOW)).toBe(5);
  });

  it('leaves 7 days with nothing blocked after a subscription ends', () => {
    const ended = (d: number) => billingStatus({ ...base, accountCreated: NOW - 400 * DAY, paidUntil: NOW - d * DAY }).status;
    expect(billingStatus({ ...base, paidUntil: NOW + DAY, renews: true })).toMatchObject({ status: 'paid', renews: true });
    expect(ended(1)).toBe('grace');
    expect(ended(8)).toBe('paused');
    expect(ended(15)).toBe('frozen');
  });

  it('pauses and freezes the same things; reminds from the free week on', () => {
    expect(['free', 'paid', 'trial', 'grace'].some((s) => changesBlocked(s as never))).toBe(false);
    expect(changesBlocked('paused') && changesBlocked('frozen')).toBe(true);
    expect(remindsToPay('paid') || remindsToPay('free')).toBe(false);
    expect(remindsToPay('trial') && remindsToPay('frozen')).toBe(true);
  });

  it('is the database’s rule (same days, same names)', () => {
    const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase', 'migrations', '20261126000000_billing.sql'), 'utf8');
    expect(sql).toContain("interval '7 days'");
    expect(sql).toContain("interval '14 days'");
    for (const s of ['free', 'paid', 'trial', 'grace', 'paused', 'frozen']) expect(sql).toContain(`'${s}'`);
  });
});

describe('after the caregiver code', () => {
  const stop = (o: Partial<Parameters<typeof afterCodeStop>[0]>) => afterCodeStop({ payer: true, laterToday: false, team: false, ...o });

  it('shows the reminder to the one who pays, once a day, and goes on with "Later"', () => {
    expect(stop({ status: 'trial', then: 'settings' })).toBe('message');
    expect(stop({ status: 'grace' })).toBe('message');
    expect(stop({ status: 'grace', laterToday: true })).toBe('none');
    expect(stop({ status: 'grace', payer: false })).toBe('none');
  });

  it('opens nothing that changes the board while paused or frozen, for anyone but the app’s team', () => {
    expect(stop({ status: 'paused', payer: false })).toBe('blocked');
    expect(stop({ status: 'frozen', laterToday: true, then: 'settings' })).toBe('blocked');
    expect(stop({ status: 'frozen', team: true })).toBe('none');
  });

  it('never holds back the guide, "Lock the screen" or a link the child opens', () => {
    for (const then of ['guide', 'lock', 'openLink']) expect(stop({ status: 'frozen', then })).toBe('none');
  });

  it('never covers the board while the child talks: a dot on the bar, the message only after the code', () => {
    const bar = fs.readFileSync(path.join(__dirname, '..', 'ui', 'UniversalBar.tsx'), 'utf8');
    expect(bar).toContain('remindsToPay(board?.billing?.status)');
    const root = fs.readFileSync(path.join(__dirname, '..', 'ui', 'Root.tsx'), 'utf8');
    expect(root).toContain("overlay?.kind === 'payment' && <PaymentPanel />");
    const pin = fs.readFileSync(path.join(__dirname, '..', 'ui', 'panels', 'CommPanels.tsx'), 'utf8');
    expect(pin).toContain("app.setOverlay({ kind: 'payment', then })");
  });
});

describe('the words', () => {
  it('exist in the three languages, say the child still talks, and never write a price', () => {
    for (const l of ['fr', 'en', 'ar'] as const) {
      const b = billingStrings(l);
      expect(b.childStillTalks.length).toBeGreaterThan(20);
      expect(b.perMonth).toContain('{price}');
      expect(JSON.stringify(b)).not.toMatch(/\d+[.,]\d\d/);
    }
    expect(Object.keys(billingStrings('ar'))).toEqual(Object.keys(billingStrings('en')));
  });
});

describe('the demo server', () => {
  const api = new LocalBackend();
  const PASSWORD = 'secret123';
  const signUp = async (role: 'parent' | 'pro', displayName: string, email: string) => {
    const sent = await api.signUp({ role, displayName, email, password: PASSWORD });
    await api.verifyCode({ email }, sent.demoCode!);
  };
  const signIn = (email: string) => api.signIn({ email, password: PASSWORD });
  const expectCode = async (p: Promise<unknown>, c: string) => {
    await expect(p).rejects.toBeInstanceOf(BackendError);
    await expect(p).rejects.toMatchObject({ code: c });
  };
  let lina = '';

  beforeAll(async () => {
    await AsyncStorage.clear();
    await signUp('parent', 'Ana', 'ana@example.com');
    await signUp('parent', 'Omar', 'omar@example.com');
    await signIn('ana@example.com');
    lina = (await api.createProfile({ name: 'Lina', age: 5, data: createDefaultProfile(), consent: CHILD_DATA_CONSENT })).id;
  });

  it('is free until payment is switched on', async () => {
    expect(await api.billingState(lina)).toMatchObject({ status: 'free', live: false, payer: true });
    await api.demoBilling({ live: true });
    expect((await api.billingState(lina)).status).toBe('trial');
  });

  it('refuses changes when paused, keeps the board readable, and gives everything back on paying', async () => {
    await api.demoBilling({ daysAgo: 10 });
    const rec = await api.getProfile(lina);
    expect((await api.billingState(lina)).status).toBe('paused');
    await expectCode(api.saveProfile(lina, rec.data, rec.version), 'payment_needed');
    await expectCode(api.invite(lina, { email: 'omar@example.com', name: 'Omar', role: 'family', ...preset('family') }), 'payment_needed');
    await expectCode(api.createPairingCode(lina, 'use'), 'payment_needed');
    await expectCode(api.takeSnapshot(lina), 'payment_needed');
    expect((await api.getProfile(lina)).id).toBe(lina);
    await api.demoBilling({ buy: 'familyYearly' });
    expect((await api.billingState(lina)).status).toBe('paid');
    expect((await api.saveProfile(lina, rec.data, rec.version)).ok).toBe(true);
    expect((await api.billingMine()).family?.renews).toBe(true);
  });

  it('tells a member of the team that someone else pays', async () => {
    await api.invite(lina, { email: 'omar@example.com', name: 'Omar', role: 'family', ...preset('family') });
    await signIn('omar@example.com');
    const inv = (await api.myInvitations()).received.find((i) => i.status === 'pending')!;
    await api.respondInvitation(inv.id, true);
    expect((await api.billingState(lina)).payer).toBe(false);
  });
});
