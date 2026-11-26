/**
 * The web version: the product is sold in the App Store and Google Play only. A browser buys
 * nothing (the demonstration excepted); the screens say where to subscribe.
 */
import { DEMO_PLANS, demoBuy, isDemo } from './purchasesDemo';
import type { BuyResult, Plan } from './purchasesTypes';

export type { BuyResult, Plan } from './purchasesTypes';

export const purchasesAvailable = () => isDemo();
export async function startPurchases(_userId: string): Promise<void> {}
export async function stopPurchases(): Promise<void> {}
export async function plans(kind: 'family' | 'pro'): Promise<Plan[]> {
  return isDemo() ? DEMO_PLANS.filter((p) => (kind === 'pro') === (p.id === 'proLicence')) : [];
}
export async function buy(plan: Plan): Promise<BuyResult> {
  if (!isDemo()) throw new Error('store');
  return demoBuy(plan.id);
}
export async function restore(): Promise<void> {}
export async function manageSubscription(): Promise<void> {}
