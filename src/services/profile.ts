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

/** หลังล็อกอินสำเร็จ — ให้ไปตาม fallback (เช่น state.from) ถ้าไม่ได้กำหนดไว้ให้ไปที่ /profile */
export async function resolvePostLoginPath(fallback: string): Promise<string> {
  const target = fallback && fallback !== '/' ? fallback : '/profile';
  return target;
}
