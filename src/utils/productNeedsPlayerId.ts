import type { OfferKind, Product } from '../types';

/** ประเภทที่ส่งเป็นโค้ด/บัตร — ไม่ต้องกรอก Player ID */
const OFFER_KIND_NO_PLAYER_ID = new Set<OfferKind>(['shop_item']);

/**
 * ต้องกรอก Player ID เฉพาะ topup ที่ส่งเข้าไอดีเกม
 * ร้านค้า / บัตรเติม (shop_item) ไม่ต้อง
 */
export function productNeedsPlayerId(product: Product): boolean {
  if (product.type !== 'topup') return false;
  if (product.offer_kind != null && OFFER_KIND_NO_PLAYER_ID.has(product.offer_kind)) return false;
  return true;
}
