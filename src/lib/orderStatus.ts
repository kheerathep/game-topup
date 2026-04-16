import type { Order } from '../types';

/** ค่าที่ตรงกับ `order_status` ใน schema.sql — ห้ามใช้ 'completed' (ไม่มีใน enum) */
export const ORDER_STATUS_ENUM_VALUES = ['pending', 'paid', 'cancelled'] as const;

/**
 * DB enum `order_status` ใน Supabase มักมีแค่ pending | paid | cancelled — ไม่มี "completed"
 * แปลงค่าผิด/legacy ให้เป็น paid ก่อนส่ง update หรือแสดงใน <select>
 */
export function normalizeOrderStatusForDb(input: string | undefined | null): Order['status'] {
  const x = String(input ?? '')
    .trim()
    .toLowerCase();
  if (x === 'completed' || x === 'done' || x === 'fulfilled' || x === 'success') return 'paid';
  if (x === 'canceled') return 'cancelled';
  if (x === 'paid' || x === 'pending' || x === 'cancelled') return x;
  return 'pending';
}

/** ใช้กับ <select> — ยอมรับเฉพาะค่าที่ option กำหนด; ค่าแปลกๆ แปลงผ่าน normalize */
export function orderStatusFromAdminSelect(raw: string): Order['status'] {
  if (raw === 'pending' || raw === 'paid' || raw === 'cancelled') return raw;
  if (raw === 'canceled') return 'cancelled';
  return normalizeOrderStatusForDb(raw);
}
