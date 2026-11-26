import type { BillingProduct } from './billing';

/** One thing to buy, with the store's price in the person's currency (`priceString`). */
export interface Plan {
  id: BillingProduct;
  /** As the store writes it ("9,99 €", "US$9.99"): never a price written by the app. */
  price: string;
  period: 'month' | 'year' | 'once';
  /** The store's package (RevenueCat), kept to buy it. */
  pkg?: unknown;
}

export type BuyResult = 'bought' | 'cancelled' | 'pending';
