/**
 * The demonstration's shop (the demo server, no store): the same plans with example prices, and a
 * "purchase" the demo server writes as if RevenueCat had said it. Never used with the real server.
 */
import { backend } from '../backend';
import type { BillingProduct } from './billing';
import type { Plan } from './purchasesTypes';

export const DEMO_PLANS: Plan[] = [
  { id: 'familyMonthly', price: '9.99 $', period: 'month' },
  { id: 'familyYearly', price: '99.99 $', period: 'year' },
  { id: 'proLicence', price: '150 $', period: 'once' },
];

export const isDemo = () => backend().kind === 'local';

export async function demoBuy(id: BillingProduct): Promise<'bought'> {
  await backend().demoBilling?.({ buy: id });
  return 'bought';
}
