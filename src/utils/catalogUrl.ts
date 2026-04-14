/** พารามิเตอร์ค้นหาและแพลตฟอร์มที่ใช้ร่วมระหว่าง /marketplace, /buy-games, /buy-game-id */

export const CATALOG_Q_KEY = 'q';

export function readCatalogQ(searchParams: URLSearchParams): string {
  return searchParams.get(CATALOG_Q_KEY)?.trim() ?? '';
}

/** เก็บเฉพาะ q + category เวลาสลับหมวด — ไม่พา genre/stock/sort ไปหน้าอื่น */
export function catalogNavigateParams(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams();
  const q = searchParams.get(CATALOG_Q_KEY);
  const cat = searchParams.get('category');
  if (q) next.set(CATALOG_Q_KEY, q);
  if (cat) next.set('category', cat);
  return next;
}

export function catalogSectionHref(path: string, searchParams: URLSearchParams): string {
  const n = catalogNavigateParams(searchParams);
  const s = n.toString();
  return s ? `${path}?${s}` : path;
}

export function setCatalogQ(
  setSearchParams: (cb: (prev: URLSearchParams) => URLSearchParams, opts?: { replace?: boolean }) => void,
  value: string,
) {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      const v = value.trim();
      if (v === '') next.delete(CATALOG_Q_KEY);
      else next.set(CATALOG_Q_KEY, v);
      return next;
    },
    { replace: true },
  );
}
