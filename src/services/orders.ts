import { normalizeOrderStatusForDb } from '../lib/orderStatus';
import { supabase } from './supabase';
import type { Order, OrderItem, ProductCategory } from '../types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cartItemsUseDbProductIds(items: OrderItem[]): boolean {
  return items.length > 0 && items.every((i) => UUID_RE.test(i.product_id));
}

type StockRow = { id: string; stock_quantity: number; track_inventory: boolean };

/** ตรวจว่าสต็อกพอสำหรับตะกร้า (สินค้าที่เปิด track_inventory) */
export async function validateOrderItemsStock(
  items: OrderItem[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabase || !cartItemsUseDbProductIds(items)) {
    return { ok: true };
  }
  const ids = [...new Set(items.map((i) => i.product_id))];
  const { data: products, error } = await supabase
    .from('products')
    .select('id, stock_quantity, track_inventory')
    .in('id', ids);
  if (error) {
    return { ok: false, message: error.message };
  }
  const rows = (products ?? []) as StockRow[];
  const needByProduct = new Map<string, number>();
  for (const it of items) {
    const pid = it.product_id;
    needByProduct.set(pid, (needByProduct.get(pid) ?? 0) + it.quantity);
  }
  for (const [productId, need] of needByProduct) {
    const p = rows.find((r) => r.id === productId);
    if (!p) continue;
    if (p.track_inventory && p.stock_quantity < need) {
      return { ok: false, message: 'INSUFFICIENT_STOCK' };
    }
  }
  return { ok: true };
}

export type PaymentMethodDb = 'qr' | 'credit_card' | 'bank_transfer';

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

  const stockCheck = await validateOrderItemsStock(items);
  if (!stockCheck.ok) {
    return { orderId: crypto.randomUUID(), persisted: false, error: new Error(stockCheck.message) };
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

/** บันทึก URL รูปสลิปหลังอัปโหลด Storage (bank transfer) — ต้องมี RLS orders_update_own_pending */
export async function setOrderPaymentSlipUrl(
  orderId: string,
  paymentSlipUrl: string,
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase is not configured.') };
  }
  const { error } = await supabase
    .from('orders')
    .update({ payment_slip_url: paymentSlipUrl })
    .eq('id', orderId);
  return { error: error ? new Error(error.message) : null };
}

export async function getOrderById(orderId: string): Promise<{ data: Order | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }
  const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (error) return { data: null, error: new Error(error.message) };
  if (!data) return { data: null, error: null };
  return {
    data: { ...data, status: normalizeOrderStatusForDb(data.status as string) } as Order,
    error: null,
  };
}

export type OrderHistoryItem = Order & {
  order_items: (OrderItem & {
    products: {
      name: string;
      image_url: string;
      category: ProductCategory;
      type?: 'topup' | 'account' | null;
      /** null/empty = สินค้าหน้า Buy Games; มีค่า = ผูกเกม (เติมเกมจากหน้าเกม) */
      game_id?: string | null;
    };
  })[];
};

/** Fetch full order history for a user, including product details */
export async function getUserOrderHistory(userId: string): Promise<{ data: OrderHistoryItem[]; error: Error | null }> {
  if (!supabase) {
    return { data: [], error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (
          name,
          image_url,
          category,
          type,
          game_id
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user order history:', error);
    return { data: [], error: new Error(error.message) };
  }

  const rows = data as unknown;
  if (!Array.isArray(rows)) {
    return { data: [], error: null };
  }
  const typedData = rows.map((row) => ({
    ...(row as Record<string, unknown>),
    status: normalizeOrderStatusForDb(String((row as { status: unknown }).status)),
  })) as OrderHistoryItem[];

  return { data: typedData, error: null };
}
