import { supabase } from './supabase';

export interface HomeHeroRow {
  id: number;
  eyebrow_en: string;
  eyebrow_th: string;
  headline_en: string;
  headline_th: string;
  subheadline_en: string;
  subheadline_th: string;
  image_url: string;
  primary_label_en: string;
  primary_label_th: string;
  primary_href: string;
  secondary_label_en: string;
  secondary_label_th: string;
  secondary_href: string;
}

export interface HomePlatformRow {
  id: string;
  sort_order: number;
  icon_name: string;
  label: string;
  href: string;
  is_active: boolean;
}

/** ใช้เมื่อยังไม่มีแถวใน DB หรือยังไม่ตั้งค่า Supabase */
export const FALLBACK_HOME_HERO: HomeHeroRow = {
  id: 1,
  eyebrow_en: 'Seasonal deals',
  eyebrow_th: 'ดีลพิเศษ',
  headline_en: 'Instant Power Up',
  headline_th: 'เติมไว ทันใจ',
  subheadline_en:
    'Unlock legendary loot and rare items with up to 70% discount. The hunt begins now.',
  subheadline_th: 'ปลดล็อกของหายากและไอเทมพิเศษ ลดสูงสุด 70% เริ่มล่าสมบัติได้เลย',
  image_url:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBEIgak1ffcVVHaPWIgDpccvT-JqW2EGbHR-21eSmYBX96J_kKvgfb9DXoAXU88AJ6PUphh31m38xibKnFguDHK8ZXCYMg6Mij8dXuxX0vgQ4qu4PKQotMHcugvVyE3v_Ockj01OtmL__gS-OI12oIBBczYBVEwkgK6efdAzHRy1GgJzV9fTCCPLO5ekVxyP6oKJS8jBNTjPf_WmqVjQ1UPKw1bsIek64EKT6GGXTRSXaoLAdqGb6-NH-1o-H_Iw-XqaXgerGmAaonc',
  primary_label_en: 'Hunt Deals',
  primary_label_th: 'ล่าดีล',
  primary_href: '/buy-games',
  secondary_label_en: 'View Vault',
  secondary_label_th: 'ดูคลัง',
  secondary_href: '/marketplace',
};

/** สำรองถ้ายังไม่อัปเดต DB — หน้าแรกใช้การ์ด 3 หมวดในโค้ดแทน (เติมเกม / ไอดีเกม / ซื้อเกม) */
export const FALLBACK_HOME_PLATFORMS: HomePlatformRow[] = [
  { id: 'fb-topup', sort_order: 0, icon_name: 'bolt', label: 'Game top-up', href: '/marketplace', is_active: true },
  { id: 'fb-id', sort_order: 1, icon_name: 'badge', label: 'Game ID', href: '/marketplace?category=account', is_active: true },
  { id: 'fb-buy', sort_order: 2, icon_name: 'shopping_bag', label: 'Buy games', href: '/buy-games', is_active: true },
];

export async function getHomeHero(): Promise<HomeHeroRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('home_hero').select('*').eq('id', 1).maybeSingle();
  if (error) {
    console.error('home_hero fetch:', error);
    return null;
  }
  return data as HomeHeroRow | null;
}

export async function getHomePlatforms(): Promise<HomePlatformRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('home_platforms')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('home_platforms fetch:', error);
    return [];
  }
  return (data ?? []) as HomePlatformRow[];
}
