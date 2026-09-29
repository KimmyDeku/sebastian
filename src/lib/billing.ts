// Shared billing definitions (used by the browser and the server).
export const PLAN_PRICES: Record<string, number> = { gold: 50, diamond: 100 };
export const PLAN_NAMES: Record<string, string> = { silver: "Silver", gold: "Gold", diamond: "Diamond" };
export type PayMethod = "card" | "ecocash" | "paypal";
export const METHOD_NAMES: Record<PayMethod, string> = { card: "Mastercard / Visa card", ecocash: "EcoCash", paypal: "PayPal" };

export type BillingDetails = { name: string; email: string; phone: string; country: string; address?: string; city?: string };

export type Receipt = {
  number: string;          // e.g. SEB-20260928-4F2K
  ref: string;             // Sebastian's payment reference
  plan: string;            // gold | diamond
  amount: number;
  currency: string;
  method: PayMethod;
  providerRef?: string;    // Paynow or PayPal transaction reference
  paidAt: string;          // ISO
  periodStart: string;     // ISO
  periodEnd: string;       // ISO (also the next billing date)
  billedTo: BillingDetails;
  emailed?: boolean;
  sig?: string;            // Sebastian's seal: proves the receipt was issued after a verified payment
};

export type BillingState = {
  plan: string;
  status: "active" | "expired";
  periodEnd: string;
  method: PayMethod;
  details: BillingDetails;
};

export function addMonth(d: Date) {
  const x = new Date(d);
  const day = x.getDate();
  x.setMonth(x.getMonth() + 1);
  if (x.getDate() < day) x.setDate(0); // e.g. 31 Jan -> 28 Feb
  return x;
}
