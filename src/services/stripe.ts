import { loadStripe } from '@stripe/stripe-js';

// Stripe publishable key — safe to expose in frontend (Test Mode)
const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

/** Singleton Stripe promise — reuse across renders */
export const stripePromise = PUBLISHABLE_KEY
  ? loadStripe(PUBLISHABLE_KEY)
  : null;

/** Supabase project URL — used to call Edge Functions */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type PaymentMethodType = 'card' | 'promptpay';

export interface CreatePaymentIntentResult {
  clientSecret: string | null;
  paymentIntentId: string | null;
  error: string | null;
}

/**
 * Calls the Supabase Edge Function `create-payment-intent`.
 * Returns clientSecret to mount Stripe Elements, or an error string.
 */
export async function createPaymentIntent(
  amount: number,
  orderId: string,
  paymentMethod: PaymentMethodType = 'card',
): Promise<CreatePaymentIntentResult> {
  if (!PUBLISHABLE_KEY) {
    return {
      clientSecret: null,
      paymentIntentId: null,
      error: 'Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in .env',
    };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ amount, orderId, currency: 'thb', paymentMethod }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { clientSecret: null, paymentIntentId: null, error: `Server error ${res.status}: ${text}` };
    }

    const json = await res.json() as { clientSecret?: string; paymentIntentId?: string; error?: string };

    if (json.error) {
      return { clientSecret: null, paymentIntentId: null, error: json.error };
    }

    return {
      clientSecret: json.clientSecret ?? null,
      paymentIntentId: json.paymentIntentId ?? null,
      error: null,
    };
  } catch (err) {
    return {
      clientSecret: null,
      paymentIntentId: null,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/** True if Stripe is configured (VITE_STRIPE_PUBLISHABLE_KEY is set) */
export function isStripeConfigured(): boolean {
  return Boolean(PUBLISHABLE_KEY);
}

/** True if the key is a test key (starts with pk_test_) */
export function isStripeTestMode(): boolean {
  return Boolean(PUBLISHABLE_KEY?.startsWith('pk_test_'));
}
