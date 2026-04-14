import { supabase } from './supabase';
import type { GameGenre, Product, ProductCategory } from '../types';
import type { CatalogFilterValue } from '../utils/marketplaceFilters';

function supabaseRequired(): Error {
  return new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.',
  );
}

export type ProductInsert = Omit<Product, 'id' | 'created_at'> & { id?: string };

/** ตัวกรองจาก Supabase — ไม่ส่ง = โหลดทั้งหมด เรียงตาม created_at ล่าสุด */
export type ProductListFilters = {
  category?: CatalogFilterValue;
  gameId?: string;
  /** true = เฉพาะสินค้าที่ไม่ผูกกับหน้าเติมเกม (game_id is null) — ใช้หน้า /buy-games */
  excludeGameLinked?: boolean;
  minPrice?: number;
  maxPrice?: number;
  flashSaleOnly?: boolean;
  bundleOnly?: boolean;
  /** มาใหม่ = created_at, ขายดี = sales_count */
  sort?: 'new' | 'bestsellers';
  /** กรองสินค้าไอดี — แมตช์ account_platform หรือ null (ทุกแพลตฟอร์ม) */
  accountPlatform?: CatalogFilterValue;
  /** ไม่ดึงหมวดนี้ — ใช้หน้า /marketplace/:slug ให้สินค้า account ไปโผล่แค่ /buy-game-id */
  excludeProductCategory?: ProductCategory;
  /** แนวเกม — ต้องรัน supabase/patch_game_genres_and_stock.sql */
  genreId?: string;
  /** กรองพร้อมขาย — true = เฉพาะ in_stock, false = เฉพาะหมด */
  inStock?: boolean;
};

export const getProducts = async (filters?: ProductListFilters): Promise<Product[]> => {
  if (!supabase) {
    throw supabaseRequired();
  }
  let q = supabase.from('products').select('*');

  if (filters) {
    if (filters.gameId) {
      q = q.eq('game_id', filters.gameId);
    }
    if (filters.excludeGameLinked) {
      q = q.is('game_id', null);
    }
    if (filters.category && filters.category !== 'all') {
      q = q.eq('category', filters.category);
    }
    if (filters.minPrice != null && Number.isFinite(filters.minPrice)) {
      q = q.gte('price', filters.minPrice);
    }
    if (filters.maxPrice != null && Number.isFinite(filters.maxPrice)) {
      q = q.lte('price', filters.maxPrice);
    }
    if (filters.flashSaleOnly) {
      q = q.eq('is_flash_sale', true);
    }
    if (filters.bundleOnly) {
      q = q.eq('is_bundle', true);
    }
    if (filters.accountPlatform && filters.accountPlatform !== 'all') {
      q = q.or(
        `account_platform.eq.${filters.accountPlatform},account_platform.is.null`,
      );
    }
    if (filters.excludeProductCategory) {
      q = q.neq('category', filters.excludeProductCategory);
    }
    if (filters.genreId) {
      q = q.eq('genre_id', filters.genreId);
    }
    if (filters.inStock === true) {
      q = q.eq('in_stock', true);
    }
    if (filters.inStock === false) {
      q = q.eq('in_stock', false);
    }
  }

  const sortCol = filters?.sort === 'bestsellers' ? 'sales_count' : 'created_at';
  q = q.order(sortCol, { ascending: false });

  const { data, error } = await q;
  if (error) {
    console.error('Supabase products fetch error:', error);
    throw new Error(error.message);
  }
  return (data ?? []) as Product[];
};

export const getGameGenres = async (): Promise<GameGenre[]> => {
  if (!supabase) {
    throw supabaseRequired();
  }
  const { data, error } = await supabase
    .from('game_genres')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('Supabase game_genres fetch error:', error);
    throw new Error(error.message);
  }
  return (data ?? []) as GameGenre[];
};

export const getProductById = async (id: string): Promise<Product | undefined> => {
  if (!supabase) {
    throw supabaseRequired();
  }
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return undefined;
    console.error('Supabase product fetch error:', error);
    throw new Error(error.message);
  }
  return data as Product;
};

/** โหลดเฉพาะสินค้าที่อยู่ในตะกร้า — ใช้หน้า Checkout */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!supabase) {
    throw supabaseRequired();
  }
  const unique = [...new Set(ids.filter((id) => typeof id === 'string' && id.length > 0))];
  if (unique.length === 0) return [];
  const { data, error } = await supabase.from('products').select('*').in('id', unique);
  if (error) {
    console.error('Supabase products by ids:', error);
    throw new Error(error.message);
  }
  return (data ?? []) as Product[];
}

export const createProduct = async (input: ProductInsert): Promise<{ data: Product | null; error: Error | null }> => {
  if (!supabase) {
    return { data: null, error: supabaseRequired() };
  }
  const { id: explicitId, ...rest } = input;
  const row = explicitId ? { ...rest, id: explicitId } : rest;
  const { data, error } = await supabase.from('products').insert(row).select().single();
  return { data: (data as Product) ?? null, error: error ? new Error(error.message) : null };
};

export const updateProduct = async (
  id: string,
  patch: Partial<Omit<Product, 'id'>>,
): Promise<{ data: Product | null; error: Error | null }> => {
  if (!supabase) {
    return { data: null, error: supabaseRequired() };
  }
  const { data, error } = await supabase.from('products').update(patch).eq('id', id).select().single();
  return { data: (data as Product) ?? null, error: error ? new Error(error.message) : null };
};

export const deleteProduct = async (id: string): Promise<{ ok: boolean; error: Error | null }> => {
  if (!supabase) {
    return { ok: false, error: supabaseRequired() };
  }
  const { error } = await supabase.from('products').delete().eq('id', id);
  return { ok: !error, error: error ? new Error(error.message) : null };
};
