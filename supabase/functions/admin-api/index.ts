/**
 * Supabase Edge Function: admin-api
 *
 * A hardened, generic admin endpoint that demonstrates the correct
 * JWT + role verification pattern for ALL admin edge functions.
 *
 * Deploy:
 *   supabase functions deploy admin-api
 *
 * Required secrets (already set for other functions):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * ─── Security flow ────────────────────────────────────────────────────────
 *
 *  1. OPTIONS preflight → 200  (CORS, no auth required)
 *  2. Missing Authorization header → 401 Unauthorized
 *  3. Invalid / expired JWT → 401 Unauthorized
 *  4. Valid JWT but role !== 'admin' → 403 Forbidden
 *  5. Valid admin JWT → 200 with requested data
 *
 * ─── Test cases ───────────────────────────────────────────────────────────
 *
 *  No token:
 *    curl -X GET $URL/functions/v1/admin-api
 *    → 401 {"error":"Missing Authorization bearer token"}
 *
 *  Valid user (non-admin) token:
 *    curl -H "Authorization: Bearer $USER_JWT" $URL/functions/v1/admin-api
 *    → 403 {"error":"Forbidden — admin role required"}
 *
 *  Valid admin token:
 *    curl -H "Authorization: Bearer $ADMIN_JWT" $URL/functions/v1/admin-api
 *    → 200 {"ok":true,"message":"Admin access granted","userId":"..."}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * verifyAdminJwt — validates the JWT and checks the admin role.
 *
 * Returns { userId } on success.
 * Throws a Response with the appropriate 401 or 403 status on failure.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY so that supabase.auth.getUser(jwt) re-validates
 * the token server-side (not just locally), preventing tampered payloads.
 */
async function verifyAdminJwt(req: Request): Promise<{ userId: string }> {
  // ── Step 1: Extract bearer token ────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!jwt) {
    throw json({ error: 'Missing Authorization bearer token' }, 401);
  }

  // ── Step 2: Validate JWT via Supabase (server-side verification) ─────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceKey) {
    console.error('admin-api: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    throw json({ error: 'Server misconfiguration' }, 503);
  }

  // Use service-role client so getUser() bypasses RLS on profiles table
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userErr,
  } = await adminClient.auth.getUser(jwt);

  if (userErr || !user) {
    // JWT invalid, expired, or revoked
    throw json({ error: 'Invalid or expired session' }, 401);
  }

  // ── Step 3: Check role = 'admin' in profiles table ───────────────────────
  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profErr) {
    console.error('admin-api: profiles lookup error', profErr);
    throw json({ error: 'Unable to verify role' }, 500);
  }

  if (!profile || profile.role !== 'admin') {
    // Authenticated user but not an admin
    throw json({ error: 'Forbidden — admin role required' }, 403);
  }

  return { userId: user.id };
}

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight — no auth required
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // All non-preflight requests must pass admin auth
    const { userId } = await verifyAdminJwt(req);

    // ── Route dispatch ────────────────────────────────────────────────────
    const url = new URL(req.url);
    const action = url.searchParams.get('action') ?? 'ping';

    if (action === 'ping') {
      return json({ ok: true, message: 'Admin access granted', userId }, 200);
    }

    // Add more admin actions here:
    // if (action === 'list-users') { ... }
    // if (action === 'export-orders') { ... }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    // If it's already a Response (thrown by verifyAdminJwt), return it directly
    if (err instanceof Response) return err;

    console.error('admin-api: unhandled error', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
