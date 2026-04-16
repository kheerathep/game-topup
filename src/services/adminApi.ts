import { normalizeOrderStatusForDb } from '../lib/orderStatus';
import { supabase } from './supabase';
import { getMyProfile } from './profile';
import { createProduct, deleteProduct, getProducts, updateProduct, type ProductInsert } from './api';
import type { AdminOrderRow, Game, GameGenre, Order, OrderItem, Product, SiteSettings } from '../types';
import type { HomeHeroRow, HomePlatformRow } from './home';

function supabaseRequired(): Error {
  return new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.',
  );
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const p = await getMyProfile();
  return p?.role === 'admin';
}

export type AdminDashboardStats = {
  orderCount: number;
  pendingOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  productCount: number;
  revenuePaid: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats | null> {
  if (!supabase) return null;

  const [
    totalRes,
    pendingRes,
    paidRes,
    cancelledRes,
    productsRes,
    paidRowsRes,
  ] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('total_price').eq('status', 'paid'),
  ]);

  if (
    totalRes.error ||
    pendingRes.error ||
    paidRes.error ||
    cancelledRes.error ||
    productsRes.error ||
    paidRowsRes.error
  ) {
    console.error(
      'admin stats',
      totalRes.error,
      pendingRes.error,
      paidRes.error,
      cancelledRes.error,
      productsRes.error,
      paidRowsRes.error,
    );
    return null;
  }

  const revenuePaid = (paidRowsRes.data ?? []).reduce((s, r) => s + Number(r.total_price ?? 0), 0);

  return {
    orderCount: totalRes.count ?? 0,
    pendingOrders: pendingRes.count ?? 0,
    paidOrders: paidRes.count ?? 0,
    cancelledOrders: cancelledRes.count ?? 0,
    productCount: productsRes.count ?? 0,
    revenuePaid,
  };
}

/** แท่งกราฟรายได้จากออเดอร์ status=paid ต่อวัน (UTC) */
export type RevenueDayBucket = {
  dateKey: string;
  label: string;
  revenue: number;
  /** ความสูงแท่ง 0–100 เปรียบเทียบกับวันที่มากสุดในช่วง */
  barHeightPct: number;
};

export async function getPaidRevenueChartBuckets(days: 7 | 30): Promise<RevenueDayBucket[]> {
  if (!supabase) return [];

  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }

  const startIso = keys[0] + 'T00:00:00.000Z';

  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total_price')
    .eq('status', 'paid')
    .gte('created_at', startIso);

  if (error) {
    console.error('admin revenue chart', error);
    return [];
  }

  const sums = new Map<string, number>();
  for (const k of keys) sums.set(k, 0);
  for (const row of data ?? []) {
    const k = new Date(row.created_at as string).toISOString().slice(0, 10);
    if (sums.has(k)) {
      sums.set(k, (sums.get(k) ?? 0) + Number(row.total_price));
    }
  }

  const revenues = keys.map((k) => sums.get(k) ?? 0);
  const max = Math.max(...revenues, 0);

  return keys.map((dateKey, i) => {
    const revenue = revenues[i];
    const d = new Date(dateKey + 'T12:00:00Z');
    const label =
      days === 7
        ? d.toLocaleDateString('en', { weekday: 'short' })
        : `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    let barHeightPct: number;
    if (max === 0) {
      barHeightPct = 4;
    } else if (revenue <= 0) {
      barHeightPct = 4;
    } else {
      barHeightPct = Math.max(12, Math.round((revenue / max) * 100));
    }
    return { dateKey, label, revenue, barHeightPct };
  });
}

/** แถวตารางแดชบอร์ด — ออเดอร์ล่าสุด + ชื่อสินค้าจาก order_items */
export type DashboardRecentTx = {
  orderId: string;
  productLabel: string;
  buyer: string;
  status: Order['status'];
  amount: number;
  createdAt: string;
};

export async function getRecentOrdersForDashboard(limit = 8): Promise<DashboardRecentTx[]> {
  if (!supabase) return [];

  type Row = {
    id: string;
    created_at: string;
    total_price: number;
    status: Order['status'];
    user_id: string;
    order_items?: {
      quantity: number;
      products: { name: string } | null;
    }[];
  };

  let list: Row[] = [];

  const nested = await supabase
    .from('orders')
    .select(
      `
      id,
      created_at,
      total_price,
      status,
      user_id,
      order_items (
        quantity,
        products ( name )
      )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (nested.error) {
    console.warn('admin recent orders (nested)', nested.error);
    const simple = await supabase
      .from('orders')
      .select('id, created_at, total_price, status, user_id')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (simple.error || !simple.data?.length) {
      console.error('admin recent orders', simple.error);
      return [];
    }
    const ids = simple.data.map((r) => r.id);
    const { data: lines } = await supabase
      .from('order_items')
      .select('order_id, product_id, products(name)')
      .in('order_id', ids);
    const namesByOrder = new Map<string, string[]>();
    for (const line of lines ?? []) {
      const oid = (line as { order_id: string; products?: { name?: string } | null }).order_id;
      const nm = (line as { products?: { name?: string } | null }).products?.name;
      if (!namesByOrder.has(oid)) namesByOrder.set(oid, []);
      if (nm) namesByOrder.get(oid)!.push(nm);
    }
    list = simple.data.map((r) => ({
      ...r,
      order_items: (namesByOrder.get(r.id) ?? []).map((name) => ({
        quantity: 1,
        products: { name },
      })),
    })) as unknown as Row[];
  } else {
    list = (nested.data ?? []) as unknown as Row[];
  }

  const userIds = [...new Set(list.map((r) => r.user_id))];
  const nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
    for (const p of profs ?? []) {
      nameMap.set(p.id, (p as { id: string; display_name: string }).display_name ?? '');
    }
  }

  return list.map((row) => {
    const items = row.order_items ?? [];
    let productLabel = '—';
    if (items.length > 0) {
      const names = items
        .map((it) => it.products?.name)
        .filter((n): n is string => typeof n === 'string' && n.length > 0);
      if (names.length > 0) {
        productLabel =
          names.slice(0, 2).join(', ') + (names.length > 2 ? ` (+${names.length - 2})` : '');
      }
    }
    const buyer = nameMap.get(row.user_id)?.trim() || `${row.user_id.slice(0, 8)}…`;
    return {
      orderId: row.id,
      productLabel,
      buyer,
      status: normalizeOrderStatusForDb(row.status as string),
      amount: Number(row.total_price),
      createdAt: row.created_at,
    };
  });
}

const ORDERS_PAGE = 30;

export async function listOrdersAdmin(page = 0): Promise<{
  orders: AdminOrderRow[];
  total: number;
}> {
  if (!supabase) return { orders: [], total: 0 };

  const from = page * ORDERS_PAGE;
  const to = from + ORDERS_PAGE - 1;

  const { data: orderRows, error, count } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('admin orders', error);
    return { orders: [], total: 0 };
  }

  const orders = (orderRows ?? []) as Order[];
  const userIds = [...new Set(orders.map((o) => o.user_id))];
  let nameByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profs, error: pe } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    if (!pe && profs) {
      nameByUser = new Map(profs.map((p) => [p.id, p.display_name ?? '']));
    }
  }

  const enriched: AdminOrderRow[] = orders.map((o) => ({
    ...o,
    status: normalizeOrderStatusForDb(o.status as string),
    customer_display_name: nameByUser.get(o.user_id) ?? null,
  }));

  return { orders: enriched, total: count ?? enriched.length };
}

export async function getOrderWithItemsAdmin(orderId: string): Promise<{
  order: Order | null;
  items: OrderItem[];
}> {
  if (!supabase) return { order: null, items: [] };

  const { data: order, error: oe } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (oe || !order) {
    console.error('admin order', oe);
    return { order: null, items: [] };
  }

  const { data: items, error: ie } = await supabase.from('order_items').select('*').eq('order_id', orderId);
  if (ie) {
    console.error('admin order_items', ie);
    return {
      order: { ...order, status: normalizeOrderStatusForDb(order.status as string) } as Order,
      items: [],
    };
  }

  return {
    order: { ...order, status: normalizeOrderStatusForDb(order.status as string) } as Order,
    items: (items ?? []) as OrderItem[],
  };
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status'] | string,
): Promise<{ ok: boolean; error: Error | null }> {
  if (!supabase) {
    return { ok: false, error: supabaseRequired() };
  }
  
  /** ห้ามส่งค่า legacy เช่น "completed" ลง Supabase — แปลงเป็น enum จริงก่อนเสมอ */
  // Rigid enforcement to guarantee no "completed" slips to DB
  let normalized: string = 'pending';
  const s = String(status).trim().toLowerCase();
  if (s === 'paid' || s === 'completed' || s === 'success' || s === 'done') {
    normalized = 'paid';
  } else if (s === 'cancelled' || s === 'canceled') {
    normalized = 'cancelled';
  }

  console.log('[DEBUG] updateOrderStatus -> sending to Supabase:', { orderId, originalStatus: status, normalized });

  const { error: rpcError } = await supabase.rpc('set_order_status_safe', {
    p_order_id: orderId,
    p_status: normalized,
  });

  if (!rpcError) {
    return { ok: true, error: null };
  }
  
  console.log('[DEBUG] RPC error fallback to REST:', rpcError);

  const { error: restError } = await supabase.from('orders').update({ status: normalized }).eq('id', orderId);
  if (!restError) {
    return { ok: true, error: null };
  }

  console.log('[DEBUG] REST update error:', restError);

  const msg = restError.message || rpcError.message || 'Update failed';
  return { ok: false, error: new Error(msg) };
}

/** หมวดแนวเกม — รวมที่ปิดใช้ */
export async function listGameGenresAdmin(): Promise<GameGenre[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('game_genres')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('admin game_genres', error);
    return [];
  }
  return (data ?? []) as GameGenre[];
}

export type GameGenreUpsert = Omit<GameGenre, 'created_at' | 'id'> & { id?: string };

export async function upsertGameGenre(
  row: GameGenreUpsert,
): Promise<{ data: GameGenre | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: supabaseRequired() };
  }
  const { id, ...rest } = row;
  if (id) {
    const { data, error } = await supabase.from('game_genres').update(rest).eq('id', id).select().single();
    return { data: (data as GameGenre) ?? null, error: error ? new Error(error.message) : null };
  }
  const { data, error } = await supabase.from('game_genres').insert(rest).select().single();
  return { data: (data as GameGenre) ?? null, error: error ? new Error(error.message) : null };
}

export async function deleteGameGenre(id: string): Promise<{ ok: boolean; error: Error | null }> {
  if (!supabase) {
    return { ok: false, error: supabaseRequired() };
  }
  const { error } = await supabase.from('game_genres').delete().eq('id', id);
  return { ok: !error, error: error ? new Error(error.message) : null };
}

export async function listAllProductsAdmin(): Promise<Product[]> {
  return getProducts();
}

export async function adminCreateProduct(
  input: ProductInsert,
): Promise<{ data: Product | null; error: Error | null }> {
  return createProduct(input);
}

export async function adminUpdateProduct(
  id: string,
  patch: Partial<Omit<Product, 'id'>>,
): Promise<{ data: Product | null; error: Error | null }> {
  return updateProduct(id, patch);
}

export async function adminDeleteProduct(id: string): Promise<{ ok: boolean; error: Error | null }> {
  return deleteProduct(id);
}

/** เกมทั้งหมด — รวมที่ปิดแสดง */
export async function listGamesAdmin(): Promise<Game[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('games').select('*').order('sort_order', { ascending: true });
  if (error) {
    console.error('admin games', error);
    return [];
  }
  return (data ?? []) as Game[];
}

export async function getHomeHeroAdmin(): Promise<HomeHeroRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('home_hero').select('*').eq('id', 1).maybeSingle();
  if (error) {
    console.error('admin home_hero', error);
    return null;
  }
  return data as HomeHeroRow | null;
}

export async function updateHomeHero(
  patch: Partial<Omit<HomeHeroRow, 'id'>>,
): Promise<{ data: HomeHeroRow | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: supabaseRequired() };
  }
  const { data, error } = await supabase
    .from('home_hero')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();
  return { data: (data as HomeHeroRow) ?? null, error: error ? new Error(error.message) : null };
}

export async function listHomePlatformsAdmin(): Promise<HomePlatformRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('home_platforms')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('admin home_platforms', error);
    return [];
  }
  return (data ?? []) as HomePlatformRow[];
}

export async function upsertHomePlatform(
  row: Omit<HomePlatformRow, 'id'> & { id?: string },
): Promise<{ data: HomePlatformRow | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: supabaseRequired() };
  }
  const { id, ...rest } = row;
  if (id) {
    const { data, error } = await supabase.from('home_platforms').update(rest).eq('id', id).select().single();
    return { data: (data as HomePlatformRow) ?? null, error: error ? new Error(error.message) : null };
  }
  const { data, error } = await supabase.from('home_platforms').insert(rest).select().single();
  return { data: (data as HomePlatformRow) ?? null, error: error ? new Error(error.message) : null };
}

export async function deleteHomePlatform(id: string): Promise<{ ok: boolean; error: Error | null }> {
  if (!supabase) {
    return { ok: false, error: supabaseRequired() };
  }
  const { error } = await supabase.from('home_platforms').delete().eq('id', id);
  return { ok: !error, error: error ? new Error(error.message) : null };
}

export async function getSiteSettingsAdmin(): Promise<SiteSettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
  if (error) {
    console.error('admin site_settings', error);
    return null;
  }
  return data as SiteSettings | null;
}

export async function updateSiteSettingsAdmin(
  patch: Partial<Omit<SiteSettings, 'id'>>,
): Promise<{ data: SiteSettings | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: supabaseRequired() };
  }
  const { data, error } = await supabase
    .from('site_settings')
    .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() })
    .select()
    .single();
  return { data: (data as SiteSettings) ?? null, error: error ? new Error(error.message) : null };
}

/** Stripe dashboard snapshot (Edge Function — requires admin JWT + server STRIPE_SECRET_KEY). */
export type StripeAdminSummary = {
  balanceAvailableThb: number;
  balancePendingThb: number;
  succeededCount30d: number;
  recent: Array<{
    id: string;
    amountThb: number;
    status: string;
    createdUnix: number;
    orderId: string | null;
  }>;
};

export async function fetchStripeAdminSummary(): Promise<{
  data: StripeAdminSummary | null;
  error: string | null;
}> {
  if (!supabase) {
    return { data: null, error: supabaseRequired().message };
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supabaseUrl || !anon) {
    return { data: null, error: 'Missing Supabase env' };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { data: null, error: 'Not signed in' };
  }
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/stripe-admin-summary`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
      },
    });
    const json = (await res.json()) as StripeAdminSummary & { error?: string };
    if (!res.ok) {
      return { data: null, error: json.error ?? `HTTP ${res.status}` };
    }
    if (json.error) {
      return { data: null, error: json.error };
    }
    return {
      data: {
        balanceAvailableThb: json.balanceAvailableThb,
        balancePendingThb: json.balancePendingThb,
        succeededCount30d: json.succeededCount30d,
        recent: json.recent ?? [],
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Network error' };
  }
}
