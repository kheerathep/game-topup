import { supabase } from './supabase';
import type { SiteSettings } from '../types';

/** อ่านตั้งค่าเว็บ/ชำระเงิน (แถว id=1) — ใช้หน้า checkout หรือ footer ได้ */
export async function getSiteSettings(): Promise<SiteSettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
  if (error) {
    console.error('site_settings fetch:', error);
    return null;
  }
  return data as SiteSettings | null;
}
