// Supabase Edge Function: create-payment-intent
// Deploy: supabase functions deploy create-payment-intent
// Requires secret: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// SECURITY: This endpoint now requires a valid Supabase JWT.
// An authenticated session is mandatory before creating a payment intent to
// prevent anonymous abuse (DoS via Stripe API quota exhaustion, fake charges).

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * verifyAuthenticatedUser — requires any valid active JWT.
 * Does NOT require admin role — any signed-in user may create a payment intent
 * for their own order.
 *
 * Throws a Response(401) if the token is missing or invalid.
 */
async function verifyAuthenticatedUser(req: Request): Promise<{ userId: string }> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!jwt) {
    throw json({ error: 'Missing Authorization bearer token — sign in first' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceKey) {
    console.error('create-payment-intent: missing server env vars');
    throw json({ error: 'Server misconfiguration' }, 503);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(jwt);

  if (error || !user) {
    throw json({ error: 'Invalid or expired session — please sign in again' }, 401);
  }

  return { userId: user.id };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    // ── Auth check (moved BEFORE business logic) ───────────────────────────
    // Rejects missing/invalid/expired tokens with 401 before touching Stripe.
    const { userId } = await verifyAuthenticatedUser(req);

    const { amount, orderId, currency = 'thb', paymentMethod } = (await req.json()) as {
      amount: number;
      orderId: string;
      currency?: string;
      paymentMethod?: 'card' | 'promptpay';
    };

    if (!amount || amount <= 0) {
      return json({ error: 'Invalid amount' }, 400);
    }

    if (!orderId) {
      return json({ error: 'orderId is required' }, 400);
    }

    // Stripe requires amount in smallest currency unit (satang for THB)
    const amountInSatang = Math.round(amount * 100);

    const paymentMethodTypes: Stripe.PaymentIntentCreateParams.PaymentMethodType[] =
      paymentMethod === 'promptpay' ? ['promptpay'] : ['card'];

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSatang,
      currency,
      payment_method_types: paymentMethodTypes,
      metadata: {
        orderId: orderId ?? '',
        userId, // logged for traceability / dispute resolution
      },
    });

    return json(
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
      200,
    );
  } catch (err) {
    // A thrown Response means it's already a well-formed 4xx — re-return it
    if (err instanceof Response) return err;

    console.error('create-payment-intent error:', err);
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
