/**
 * Buying in the tablet and phone apps (App Store, Google Play) through RevenueCat.
 * The RevenueCat app user id is the account's id, so the server (caa-billing) can ask RevenueCat
 * what this account bought. What is bought is never decided here: after a purchase or a restore
 * the server is asked to read it again (`billingRefresh`), and the screens show what the server says.
 *
 * Keys: EXPO_PUBLIC_REVENUECAT_IOS_KEY, EXPO_PUBLIC_REVENUECAT_ANDROID_KEY (public SDK keys,
 * docs/API-KEYS.md). Without the key for this device, buying is not offered (`purchasesAvailable`).
 * Every store sheet is wrapped in `outside()`: on Android it puts the app in the background.
 */
import { Platform } from 'react-native';
import { ENTITLEMENTS, OFFERINGS, type BillingProduct } from './billing';
import { outside } from './outside';
import { DEMO_PLANS, demoBuy, isDemo } from './purchasesDemo';
import type { BuyResult, Plan } from './purchasesTypes';

export type { BuyResult, Plan } from './purchasesTypes';

type Rc = typeof import('react-native-purchases').default;

const key = () =>
  Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : Platform.OS === 'android' ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY : undefined;

let rc: Rc | null = null;
let who: string | null = null;

function lib(): Rc | null {
  if (rc) return rc;
  try {
    // Loaded only on a device with a key: the native module is absent from Expo Go and the tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rc = (require('react-native-purchases') as { default: Rc }).default;
  } catch {
    rc = null;
  }
  return rc;
}

/** Can this device buy (a store app with its key), or is it the demonstration? */
export function purchasesAvailable(): boolean {
  if (isDemo()) return true;
  return !!key() && (Platform.OS === 'ios' || Platform.OS === 'android');
}

/** The signed-in account buys and restores for itself. Called before the plans are shown. */
export async function startPurchases(userId: string): Promise<void> {
  if (isDemo() || !purchasesAvailable()) return;
  const p = lib();
  if (!p) return;
  if (!(await p.isConfigured().catch(() => false))) {
    p.configure({ apiKey: key()!, appUserID: userId });
    who = userId;
    return;
  }
  if (who !== userId) {
    await p.logIn(userId);
    who = userId;
  }
}

/** At sign-out: the next person on this device does not restore this account's purchases. */
export async function stopPurchases(): Promise<void> {
  if (!who) return;
  const p = lib();
  who = null;
  await p?.logOut().catch(() => {});
}

const productOf = (kind: 'family' | 'pro', packageType: string, identifier: string): BillingProduct | null => {
  if (kind === 'pro') return 'proLicence';
  if (packageType === 'ANNUAL' || /year|annual/i.test(identifier)) return 'familyYearly';
  if (packageType === 'MONTHLY' || /month/i.test(identifier)) return 'familyMonthly';
  return null;
};

/** What can be bought, with the store's prices. Empty when the store does not answer. */
export async function plans(kind: 'family' | 'pro'): Promise<Plan[]> {
  if (isDemo()) return DEMO_PLANS.filter((p) => (kind === 'pro') === (p.id === 'proLicence'));
  const p = lib();
  if (!p) return [];
  const all = await p.getOfferings();
  const offering = all.all[OFFERINGS[kind]];
  const out: Plan[] = [];
  for (const pkg of offering?.availablePackages ?? []) {
    const id = productOf(kind, pkg.packageType, pkg.identifier);
    if (!id || out.some((x) => x.id === id)) continue;
    out.push({ id, price: pkg.product.priceString, period: id === 'familyYearly' ? 'year' : id === 'familyMonthly' ? 'month' : 'once', pkg });
  }
  return out.sort((a, b) => ['familyMonthly', 'familyYearly', 'proLicence'].indexOf(a.id) - ['familyMonthly', 'familyYearly', 'proLicence'].indexOf(b.id));
}

/** The store's purchase sheet. 'pending': the store waits (a parent's approval, a slow payment). */
export async function buy(plan: Plan): Promise<BuyResult> {
  if (isDemo()) return demoBuy(plan.id);
  const p = lib();
  if (!p || !plan.pkg) throw new Error('store');
  try {
    const r = await outside(() => p.purchasePackage(plan.pkg as Parameters<Rc['purchasePackage']>[0]));
    const ent = plan.id === 'proLicence' ? ENTITLEMENTS.pro : ENTITLEMENTS.family;
    return r.customerInfo.entitlements.active[ent] ? 'bought' : 'pending';
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; code?: string };
    if (err.userCancelled || err.code === p.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    if (err.code === p.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
    throw e;
  }
}

/** "Restore purchases" (a new device, the app installed again). */
export async function restore(): Promise<void> {
  if (isDemo()) return;
  const p = lib();
  if (!p) throw new Error('store');
  await outside(() => p.restorePurchases());
}

/** The store's own page to change or cancel the subscription. */
export async function manageSubscription(): Promise<void> {
  if (isDemo()) return;
  const p = lib();
  if (!p) return;
  await outside(async () => {
    if (Platform.OS === 'ios') return p.showManageSubscriptions();
    const info = await p.getCustomerInfo();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Linking } = require('react-native') as typeof import('react-native');
    await Linking.openURL(info.managementURL ?? 'https://play.google.com/store/account/subscriptions');
  });
}
