import type { Product, ProductCategory } from '../types';

/** ค่ากรองในตลาด = ค่า category ในฐานข้อมูล หรือ all */
export type CatalogFilterValue = 'all' | ProductCategory;

/**
 * อ่านจาก ?category= หรือ ?platform= (legacy) — ใช้ช่องเดียวใน UI
 */
export function catalogFilterFromSearch(searchParams: URLSearchParams): CatalogFilterValue {
  const c = searchParams.get('category')?.toLowerCase();
  const legacy = searchParams.get('platform')?.toLowerCase();
  const raw = c || (legacy && legacy !== 'all' ? legacy : null);
  if (raw === 'mobile') return 'mobile';
  if (raw === 'pc') return 'pc';
  if (raw === 'account') return 'account';
  if (raw === 'playstation' || raw === 'ps' || raw === 'psn') return 'playstation';
  if (raw === 'xbox') return 'xbox';
  if (raw === 'switch') return 'switch';
  return 'all';
}

export function filterByCatalog(products: Product[], filter: CatalogFilterValue): Product[] {
  if (filter === 'all') return products;
  return products.filter((p) => p.category.toLowerCase() === filter);
}

/** แปลงข้อความในช่องราคา (มี ฿ หรือคอมมาได้) เป็นตัวเลข */
export function parseBahtInput(raw: string): number | undefined {
  const cleaned = raw.replace(/[฿,\s]/g, '');
  if (cleaned === '') return undefined;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function parseProductPrice(price: number | string): number {
  if (typeof price === 'number' && Number.isFinite(price)) return price;
  const n = parseFloat(String(price));
  return Number.isFinite(n) ? n : 0;
}

/** ตัวเลือกในตลาดซื้อขาย (หนึ่งรายการต่อหมวด — ไม่แยก platform ซ้ำ) */
export const CATALOG_CATEGORY_OPTIONS: { value: CatalogFilterValue; labelKey: string }[] = [
  { value: 'all', labelKey: 'catalogAll' },
  { value: 'mobile', labelKey: 'catalogMobile' },
  { value: 'pc', labelKey: 'catalogPC' },
  { value: 'playstation', labelKey: 'catalogPlayStation' },
  { value: 'xbox', labelKey: 'catalogXbox' },
  { value: 'switch', labelKey: 'catalogSwitch' },
  { value: 'account', labelKey: 'catalogAccount' },
];

/** หน้าเติมเกม (/marketplace) — ไม่รวมบัญชีเกม */
export const TOPUP_PLATFORM_FILTER_OPTIONS: { value: CatalogFilterValue; labelKey: string }[] =
  CATALOG_CATEGORY_OPTIONS.filter((o) => o.value !== 'account');

/** ป้าย i18n สำหรับ product_category / platform ของเกม */
export function catalogLabelKeyForCategory(cat: ProductCategory): string {
  const opt = CATALOG_CATEGORY_OPTIONS.find((o) => o.value === cat);
  return opt?.labelKey ?? 'catalogMobile';
}

/** หมวดที่ถือว่า “เกม” ในหน้า Buy Games */
export const GAME_STORE_CATEGORIES: ProductCategory[] = [
  'pc',
  'mobile',
  'playstation',
  'xbox',
  'switch',
];

export function isGameStoreCategory(cat: ProductCategory): boolean {
  return GAME_STORE_CATEGORIES.includes(cat);
}
