import type { OrderItem } from '../types';

/** คีย์เดียวกัน = รวมเป็นบรรทัดเดียวในตะกร้า (เพิ่ม quantity) */
export function cartLineKey(item: Pick<OrderItem, 'product_id' | 'player_id' | 'selected_option'>): string {
  const play = item.player_id ?? '';
  const opt = item.selected_option == null ? '' : String(item.selected_option);
  return `${item.product_id}\t${play}\t${opt}`;
}
