// Supabase Edge Function: stripe-admin-summary
// Deploy: supabase functions deploy stripe-admin-summary
// Requires secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// GET — Authorization: Bearer <user access_token>. Only profiles.role = 'admin'.

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function sumThbCents(rows: Array<{ amount: number; currency: string }>): number {
  return rows.filter((r) => r.currency.toLowerCase() === 'thb').reduce((s, r) => s + r.amount, 0);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const secret = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secret) {
    return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY is not set on the server' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Missing Authorization bearer token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceKey);

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(jwt);

  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profErr || profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const balance = await stripe.balance.retrieve();
    const availableCents = sumThbCents(balance.available);
    const pendingCents = sumThbCents(balance.pending);

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const last30 = await stripe.paymentIntents.list({
      limit: 100,
      created: { gte: thirtyDaysAgo },
    });
    const succeededCount30d = last30.data.filter((pi) => pi.status === 'succeeded').length;

    const recentList = await stripe.paymentIntents.list({ limit: 12 });
    const recent = recentList.data.map((pi) => ({
      id: pi.id,
      amountThb: pi.amount / 100,
      status: pi.status,
      createdUnix: pi.created,
      orderId: (pi.metadata?.orderId as string | undefined) ?? null,
    }));

    return new Response(
      JSON.stringify({
        balanceAvailableThb: availableCents / 100,
        balancePendingThb: pendingCents / 100,
        succeededCount30d,
        recent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('stripe-admin-summary error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Stripe request failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
