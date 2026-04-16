// Supabase Edge Function: stripe-webhook
// Deploy: supabase functions deploy stripe-webhook
// Set secret: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
// Register endpoint in Stripe Dashboard: https://<project>.supabase.co/functions/v1/stripe-webhook
// Events to listen: payment_intent.succeeded, payment_intent.payment_failed

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const body = await req.text();

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      throw new Error('Missing stripe-signature or STRIPE_WEBHOOK_SECRET');
    }
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(
      JSON.stringify({ error: 'Invalid webhook signature' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Supabase admin client (bypass RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;

      if (orderId) {
        const { error } = await supabase
          .from('orders')
          .update({
            status: 'paid',
            stripe_payment_intent_id: pi.id,
          })
          .eq('id', orderId);

        if (error) {
          console.error('Failed to update order status:', error);
          return new Response(
            JSON.stringify({ error: 'DB update failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        console.log(`Order ${orderId} marked as paid (PI: ${pi.id})`);
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;

      if (orderId) {
        await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', orderId);

        console.log(`Order ${orderId} marked as cancelled (PI: ${pi.id})`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
