import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

let SUPABASE_URL = process.env.VITE_SUPABASE_URL;
let SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  try {
    const envFile = fs.readFileSync(path.resolve('.env'), 'utf-8');
    for (const line of envFile.split('\n')) {
      if (line.startsWith('VITE_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
      if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) SUPABASE_ANON_KEY = line.split('=')[1].trim();
    }
  } catch (e) {
    console.warn('Could not read .env file', e);
  }
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTests() {
  console.log("=== Authentication Flow End-to-End Verification ===\n");

  const randomString = crypto.randomUUID().split('-')[0];
  const testEmail = `test_user_${randomString}@example.com`;
  const testPassword = 'TestPassword123!';
  let accessToken = '';
  let userId = '';

  // 1. Unauthenticated Checks
  console.log("--- 1. Testing Unauthenticated Access ---");
  
  const resPaymentUnauth = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 100, orderId: "test_unauth" })
  });
  console.log(`[Auth Check] Unauthenticated Payment Intent: Status ${resPaymentUnauth.status}`);

  const resAdminUnauth = await fetch(`${SUPABASE_URL}/functions/v1/admin-api?action=ping`);
  console.log(`[Auth Check] Unauthenticated Admin API: Status ${resAdminUnauth.status}`);


  // 2. Register & Login User
  console.log(`\n--- 2. Provisioning Test Identity (${testEmail}) ---`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (signUpError) {
    console.error("SignUp Error:", signUpError);
    return;
  }
  
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginError) {
    console.error("Login Error:", loginError);
    return;
  }

  accessToken = loginData.session.access_token;
  userId = loginData.user.id;
  console.log("[PASS] Identity provisioned. Session active.");

  // 3. Testing Privilege Escalation (Authenticated but Unauthorized)
  console.log("\n--- 3. Testing Profile Privilege Escalation (DB Level) ---");
  console.log(`[QA] Attempting unauthorized role change for user ${userId}...`);
  
  const { error: selfPromoteError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId);
  
  if (selfPromoteError) {
    // 42501 is Postgres Insufficient Privilege
    if (selfPromoteError.code === '42501' || selfPromoteError.message.includes('Forbidden')) {
      console.log(`[PASS] Escalation blocked by RLS/Trigger: ${selfPromoteError.message}`);
    } else {
      console.log(`[INFO] Update failed, but code was ${selfPromoteError.code}: ${selfPromoteError.message}`);
    }
  } else {
    // If no error, we check if the role actually changed
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (profile?.role === 'admin') {
      console.log(`[FAIL] CRITICAL: Escalation SUCCEEDED! User is now admin. SQL patch NOT applied.`);
    } else {
      console.log(`[PASS] Update appeared to succeed but role did not change (No permission to change role).`);
    }
  }

  
  // 4. Authenticated (Non-Admin) Checks
  console.log("\n--- 4. Testing Role-Based Access Control (RBAC) ---");

  // Payment Intent with auth
  console.log("[QA] Testing create-payment-intent with valid User JWT...");
  const resPaymentAuth = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ amount: 100, orderId: "test_auth" })
  });
  
  const paymentBody = await resPaymentAuth.json().catch(() => ({}));
  if (resPaymentAuth.status === 200 || resPaymentAuth.status === 201) {
    console.log(`[PASS] Payment API accessible with User JWT (Expected for users).`);
  } else if (resPaymentAuth.status === 401 && paymentBody.message?.includes('ES256')) {
    console.log(`[ISSUE] Supabase Gateway ES256 mismatch detect. Auth works, but Gateway blocks request.`);
  } else {
    console.log(`[INFO] Payment API responded with Status ${resPaymentAuth.status}: ${JSON.stringify(paymentBody)}`);
  }

  // Admin API with auth (but NOT admin role)
  console.log("[QA] Testing admin-api with non-admin User JWT...");
  const resAdminAuth = await fetch(`${SUPABASE_URL}/functions/v1/admin-api?action=ping`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (resAdminAuth.status === 403) {
    console.log(`[PASS] Admin API correctly returned 403 Forbidden.`);
  } else if (resAdminAuth.status === 404) {
    console.log(`[INFO] Admin API returned 404 (Edge Function not deployed to remote).`);
  } else {
    console.log(`[INFO] Admin API returned ${resAdminAuth.status}: ${JSON.stringify(await resAdminAuth.json().catch(() => ({})))}`);
  }

  console.log("\n=== End-to-End Verification Summary ===");
  console.log("1. RLS Security: " + (selfPromoteError ? "HARDENED" : "VULNERABLE"));
  console.log("2. Edge Auth: " + (resPaymentUnauth.status === 401 ? "ENFORCED" : "OPEN"));
  console.log("3. Admin RBAC: " + (resAdminAuth.status === 403 ? "ENFORCED" : "BYPASSED/NOT DEPLOYED"));
}

runTests();
