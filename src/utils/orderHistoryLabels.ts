import type { ProductCategory } from '../types';

/** ข้อมูลสินค้าแนบบรรทัดใน order history — ใช้แยกป้าย ไม่ใช้แค่ category (เป็นแพลตฟอร์ม) */
export type OrderHistoryProductStub = {
  category: ProductCategory;
  game_id?: string | null;
};

/**
 * คีย์ i18n สำหรับป้ายหมวดในรายการสั่งซื้อ
 * - บัญชีเกม: category account
 * - ซื้อเกม: สินค้า store (game_id ว่าง) — ตาม getProducts({ excludeGameLinked: true }) ใน BuyGames
 * - เติมเกม: สินค้าผูกแถวเกม (มี game_id)
 */
export function orderProductKindLabelKey(p: OrderHistoryProductStub): 'productTypeAccount' | 'homeCatBuyGameTitle' | 'productTypeTopup' {
  if (p.category === 'account') return 'productTypeAccount';
  const linked = p.game_id != null && String(p.game_id).trim() !== '';
  if (!linked) return 'homeCatBuyGameTitle';
  return 'productTypeTopup';
}
