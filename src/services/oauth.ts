import { supabase } from './supabase';

export type OAuthProvider = 'google' | 'facebook';

/**
 * Opens Google or Facebook OAuth (redirect). Requires providers enabled in Supabase Dashboard.
 */
export async function signInWithOAuthProvider(provider: OAuthProvider): Promise<{ error: Error | null }> {
  if (!supabase) {
    return {
      error: new Error(
        'การเข้าสู่ระบบด้วย Google/Facebook ต้องตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ในไฟล์ .env',
      ),
    };
  }

  const redirectTo = `${window.location.origin}/`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });

  return { error: error ? new Error(error.message) : null };
}
