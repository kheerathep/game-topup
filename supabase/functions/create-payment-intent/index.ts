// Supabase Edge Function: create-payment-intent
// Deploy: supabase functions deploy create-payment-intent
// Set secret: supabase secrets set STRIPE_SECRET_KEY=sk_test_...

import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, orderId, currency = 'thb', paymentMethod } = await req.json() as {
      amount: number;
      orderId: string;
      currency?: string;
      paymentMethod?: 'card' | 'promptpay';
    };

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stripe requires amount in smallest currency unit (satang for THB)
    const amountInSatang = Math.round(amount * 100);

    // Build payment_method_types based on selection
    const paymentMethodTypes: Stripe.PaymentIntentCreateParams.PaymentMethodType[] =
      paymentMethod === 'promptpay' ? ['promptpay'] : ['card'];

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSatang,
      currency,
      payment_method_types: paymentMethodTypes,
      metadata: {
        orderId: orderId ?? '',
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('create-payment-intent error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
