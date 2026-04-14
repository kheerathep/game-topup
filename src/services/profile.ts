import { supabase } from './supabase';

export type ProfileRole = 'user' | 'admin';

export async function getMyProfile(): Promise<{ role: ProfileRole } | null> {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (error || !data?.role) return null;
  return { role: data.role as ProfileRole };
}

/** หลังล็อกอินสำเร็จ — admin ไปแดชบอร์ดผู้ดูแล ส่วน user ไปตาม fallback (เช่น state.from หรือ /) */
export async function resolvePostLoginPath(fallback: string): Promise<string> {
  try {
    const p = await getMyProfile();
    if (p?.role === 'admin') return '/admin/dashboard';
  } catch {
    /* เช่น API ล้ม — ใช้ fallback */
  }
  return fallback;
}
