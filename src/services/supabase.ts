import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function trimEnv(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

const supabaseUrl = trimEnv(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = trimEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

function isAllowedSupabaseApiUrl(url: string): boolean {
  try {
    const u = new URL(url);
    // Hosted projects use https://<ref>.supabase.co; local CLI uses http://127.0.0.1:54321
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function isLikelyJwt(key: string): boolean {
  return key.startsWith('eyJ') && key.split('.').length === 3;
}

/** True when URL and anon key look usable (avoids silent misconfiguration in CI/tests). */
export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (!isAllowedSupabaseApiUrl(supabaseUrl)) return false;
  if (!isLikelyJwt(supabaseAnonKey)) return false;
  return true;
}

let client: SupabaseClient | null = null;
if (isSupabaseConfigured()) {
  client = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
} else if (import.meta.env.DEV && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_ANON_KEY)) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set but invalid. ' +
      'Use a full API URL (https or local http) and the anon JWT from Project Settings → API.',
  );
}

// Catalog and orders require these env vars; without them, product APIs throw or return errors.
export const supabase = client;
