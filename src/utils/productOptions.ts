import type { Product } from '../types';

/** แปลง options จาก Supabase (numeric[]) เป็นตัวเลขใช้เลือกยอดเติม */
export function normalizePriceOptions(raw: Product['options']): number[] {
  if (raw == null || !Array.isArray(raw)) return [];
  return raw
    .map((x) => (typeof x === 'number' && Number.isFinite(x) ? x : parseFloat(String(x))))
    .filter((n) => Number.isFinite(n) && n >= 0);
}
