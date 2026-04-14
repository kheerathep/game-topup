import { supabase } from './supabase';
import type { Order, OrderItem } from '../types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cartItemsUseDbProductIds(items: OrderItem[]): boolean {
  return items.length > 0 && items.every((i) => UUID_RE.test(i.product_id));
}

export type PaymentMethodDb = 'qr' | 'credit_card';

/**
 * Inserts order + order_items when Supabase is configured and cart lines use real product UUIDs.
 * Otherwise returns a local order id (confirmation page still works).
 */
export async function createOrder(
  userId: string,
  items: OrderItem[],
  totalPrice: number,
  paymentMethod: PaymentMethodDb,
): Promise<{ orderId: string; persisted: boolean; error: Error | null }> {
  if (!supabase || !cartItemsUseDbProductIds(items)) {
    return { orderId: crypto.randomUUID(), persisted: false, error: null };
  }

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      total_price: totalPrice,
      status: 'pending',
      payment_method: paymentMethod,
    })
    .select('id')
    .single();

  if (orderError || !orderRow) {
    return {
      orderId: crypto.randomUUID(),
      persisted: false,
      error: orderError ? new Error(orderError.message) : new Error('Failed to create order'),
    };
  }

  const orderId = orderRow.id as string;

  const rows = items.map((item) => ({
    order_id: orderId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    player_id: item.player_id ?? null,
    selected_option: item.selected_option ?? null,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(rows);

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', orderId);
    return { orderId: crypto.randomUUID(), persisted: false, error: new Error(itemsError.message) };
  }

  return { orderId, persisted: true, error: null };
}

export async function getOrderById(orderId: string): Promise<{ data: Order | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }
  const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Order | null, error: null };
}
