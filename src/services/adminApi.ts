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
    return { order: order as Order, items: [] };
  }

  return { order: order as Order, items: (items ?? []) as OrderItem[] };
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
): Promise<{ ok: boolean; error: Error | null }> {
  if (!supabase) {
    return { ok: false, error: supabaseRequired() };
  }
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  return { ok: !error, error: error ? new Error(error.message) : null };
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
