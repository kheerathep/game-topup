import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Monitor, Smartphone, Gamepad2, ShoppingCart, LayoutGrid, List, Star } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { DarkFilterSelect } from '../components/ui/DarkFilterSelect';
import {
  CatalogSidebar,
  CATALOG_SIDEBAR_INPUT_CLASS,
  CATALOG_SIDEBAR_LABEL_CLASS,
} from '../components/catalog/CatalogSidebar';
import { getGameGenres, getProducts } from '../services/api';
import type { GameGenre, Product, ProductCategory } from '../types';
import { useCart } from '../hooks/useCart.tsx';
import { useLanguage } from '../context/LanguageContext';
import {
  isGameStoreCategory,
  parseProductPrice,
  catalogLabelKeyForCategory,
} from '../utils/marketplaceFilters';
import { readCatalogQ } from '../utils/catalogUrl';

type BuyGamesTab = 'all' | ProductCategory;
type SortKey = 'new' | 'bestsellers' | 'price_asc' | 'price_desc';
type ViewMode = 'grid' | 'list';
type StockFilter = 'all' | 'in_stock' | 'out_of_stock';

function buyTabFromSearch(searchParams: URLSearchParams): BuyGamesTab {
  const raw = searchParams.get('category')?.toLowerCase();
  if (raw === 'pc') return 'pc';
  if (raw === 'mobile') return 'mobile';
  if (raw === 'playstation') return 'playstation';
  if (raw === 'xbox') return 'xbox';
  if (raw === 'switch') return 'switch';
  return 'all';
}

function sortParamFromSearch(searchParams: URLSearchParams): SortKey {
  const s = searchParams.get('sort')?.toLowerCase();
  if (s === 'bestsellers') return 'bestsellers';
  if (s === 'price_asc') return 'price_asc';
  if (s === 'price_desc') return 'price_desc';
  return 'new';
}

function viewParamFromSearch(searchParams: URLSearchParams): ViewMode {
  return searchParams.get('view') === 'list' ? 'list' : 'grid';
}

function stockFromSearch(searchParams: URLSearchParams): StockFilter {
  const s = searchParams.get('stock');
  if (s === 'in_stock' || s === 'out_of_stock') return s;
  return 'all';
}

function PlatformIcon({ category }: { category: ProductCategory }) {
  const cls = 'h-4 w-4';
  switch (category) {
    case 'pc':
      return <Monitor className={cls} aria-hidden />;
    case 'mobile':
      return <Smartphone className={cls} aria-hidden />;
    default:
      return <Gamepad2 className={cls} aria-hidden />;
  }
}

export function BuyGames() {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [genres, setGenres] = useState<GameGenre[]>([]);
  const [genreLoadError, setGenreLoadError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [minPriceStr, setMinPriceStr] = useState('');
  const [maxPriceStr, setMaxPriceStr] = useState('');
  const [flashOnly, setFlashOnly] = useState(false);
  const { dispatch: cartDispatch } = useCart();

  const platformTab = useMemo(() => buyTabFromSearch(searchParams), [searchParams]);
  const sort = useMemo(() => sortParamFromSearch(searchParams), [searchParams]);
  const view = useMemo(() => viewParamFromSearch(searchParams), [searchParams]);
  const genreId = searchParams.get('genre') ?? '';
  const stockFilter = useMemo(() => stockFromSearch(searchParams), [searchParams]);
  const searchQuery = useMemo(() => readCatalogQ(searchParams), [searchParams]);

  const setGenreId = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!id) next.delete('genre');
          else next.set('genre', id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setStockFilter = useCallback(
    (next: StockFilter) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'all') p.delete('stock');
          else p.set('stock', next);
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setSort = useCallback(
    (next: SortKey) => {
      const p = new URLSearchParams(searchParams);
      if (next === 'new') p.delete('sort');
      else p.set('sort', next);
      setSearchParams(p, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setView = useCallback(
    (next: ViewMode) => {
      const p = new URLSearchParams(searchParams);
      if (next === 'grid') p.delete('view');
      else p.set('view', next);
      setSearchParams(p, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    let cancelled = false;
    void getGameGenres()
      .then((rows) => {
        if (!cancelled) {
          setGenres(rows);
          setGenreLoadError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGenres([]);
          setGenreLoadError(t('buyGamesGenresLoadError'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const filters: Parameters<typeof getProducts>[0] = { excludeGameLinked: true };
    if (platformTab !== 'all') filters.category = platformTab;
    if (genreId) filters.genreId = genreId;
    if (stockFilter === 'in_stock') filters.inStock = true;
    if (stockFilter === 'out_of_stock') filters.inStock = false;

    void getProducts(filters)
      .then((data) => {
        if (!cancelled) {
          setProducts(data.filter((p) => isGameStoreCategory(p.category)));
          setLoadError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load games');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [platformTab, genreId, stockFilter]);

  const genreLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of genres) {
      map[g.id] = language === 'th' ? g.label_th : g.label_en;
    }
    return map;
  }, [genres, language]);

  const genreOptions = useMemo(
    () => [
      { value: '', label: t('buyGamesFilterGenreAll') },
      ...genres.map((g) => ({
        value: g.id,
        label: language === 'th' ? g.label_th : g.label_en,
      })),
    ],
    [genres, language, t],
  );

  const platformOptions = useMemo(
    () => [
      { value: 'all', label: t('buyGamesFilterAny') },
      { value: 'pc', label: t('catalogPC') },
      { value: 'mobile', label: t('catalogMobile') },
      { value: 'playstation', label: t('catalogPlayStation') },
      { value: 'xbox', label: t('catalogXbox') },
      { value: 'switch', label: t('catalogSwitch') },
    ],
    [t],
  );

  const stockOptions = useMemo(
    () => [
      { value: 'all', label: t('buyGamesFilterStockAll') },
      { value: 'in_stock', label: t('buyGamesFilterInStockOnly') },
      { value: 'out_of_stock', label: t('buyGamesFilterOutOfStock') },
    ],
    [t],
  );

  const sortOptions = useMemo(
    () => [
      { value: 'new', label: t('buyGamesSortNew') },
      { value: 'bestsellers', label: t('buyGamesSortBestsellers') },
      { value: 'price_asc', label: t('buyGamesSortPriceLow') },
      { value: 'price_desc', label: t('buyGamesSortPriceHigh') },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    let list = products;
    const q = searchQuery.trim().toLowerCase(); // จาก ?q= — เชื่อมกับ sidebar ร่วม
    if (q) {
      list = list.filter((p) => {
        const name = p.name.toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }
    if (flashOnly) {
      list = list.filter((p) => p.is_flash_sale);
    }
    const minP = parseFloat(minPriceStr.replace(/,/g, ''));
    const maxP = parseFloat(maxPriceStr.replace(/,/g, ''));
    if (Number.isFinite(minP)) {
      list = list.filter((p) => parseProductPrice(p.price) >= minP);
    }
    if (Number.isFinite(maxP)) {
      list = list.filter((p) => parseProductPrice(p.price) <= maxP);
    }

    const sorted = [...list];
    if (sort === 'bestsellers') {
      sorted.sort((a, b) => (b.sales_count ?? 0) - (a.sales_count ?? 0));
    } else if (sort === 'price_asc') {
      sorted.sort((a, b) => parseProductPrice(a.price) - parseProductPrice(b.price));
    } else if (sort === 'price_desc') {
      sorted.sort((a, b) => parseProductPrice(b.price) - parseProductPrice(a.price));
    } else {
      sorted.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
    }
    return sorted;
  }, [products, searchQuery, flashOnly, minPriceStr, maxPriceStr, sort]);

  const locale = language === 'th' ? 'th-TH' : 'en-US';

  const renderCard = (p: Product, listMode: boolean) => {
    const price = parseProductPrice(p.price);
    const sales = p.sales_count ?? 0;
    const ratingLabel =
      sales >= 500 ? '4.9' : sales >= 100 ? '4.8' : sales >= 20 ? '4.7' : '4.6';
    const available = p.in_stock !== false;
    const genreName = p.genre_id ? genreLabels[p.genre_id] : null;

    const inner = (
      <>
        <div
          className={
            listMode
              ? 'relative flex w-40 shrink-0 items-center justify-center self-stretch overflow-hidden bg-black/80 sm:w-48'
              : 'relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden bg-black/80'
          }
        >
          <img
            src={p.image_url}
            alt=""
            className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
          />
          {p.is_flash_sale && (
            <span className="absolute right-2 top-2 rounded-md bg-violet-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">
              {t('buyGamesFeatured')}
            </span>
          )}
          {!available && (
            <span className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/20">
              {t('buyGamesOutOfStock')}
            </span>
          )}
          <span className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/55 text-white backdrop-blur-sm">
            <PlatformIcon category={p.category} />
          </span>
        </div>
        <div className={listMode ? 'flex min-w-0 flex-1 flex-col justify-center py-3 pr-3 sm:py-4' : 'flex flex-1 flex-col p-4'}>
          <Link to={`/product/${p.id}`} className="min-w-0">
            <h3
              className={`font-bold text-white transition-colors group-hover:text-[--color-primary] ${
                listMode ? 'line-clamp-2 text-base sm:text-lg' : 'line-clamp-2 text-sm'
              }`}
            >
              {p.name}
            </h3>
          </Link>
          {genreName && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[--color-primary]/90">{genreName}</p>
          )}
          {!listMode && (
            <p className="mt-1 line-clamp-2 text-xs text-[--color-on-surface-variant]">{p.description || p.type}</p>
          )}
          <div className={`mt-3 flex flex-wrap items-center gap-2 ${listMode ? '' : ''}`}>
            <span className="text-lg font-black text-white sm:text-xl">฿{price.toLocaleString(locale)}</span>
            {sales > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-amber-400/90">
                <Star className="h-3.5 w-3.5 fill-amber-400/80 text-amber-400/80" aria-hidden />
                <span className="font-semibold text-white/90">{ratingLabel}</span>
                <span className="text-[--color-outline-variant]">
                  · {sales.toLocaleString(locale)} {t('buyGamesSold')}
                </span>
              </span>
            )}
          </div>
          <div className={`mt-auto flex items-center justify-between pt-3 ${listMode ? 'pt-2' : ''}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[--color-outline-variant]">
              {t(catalogLabelKeyForCategory(p.category))}
            </span>
            <button
              type="button"
              disabled={!available}
              onClick={() =>
                cartDispatch({
                  type: 'ADD_ITEM',
                  payload: {
                    id: crypto.randomUUID(),
                    order_id: '',
                    product_id: p.id,
                    quantity: 1,
                    unit_price: price,
                  },
                })
              }
              className="rounded-xl bg-[--color-primary]/20 p-2.5 text-[--color-primary] transition-all hover:bg-[--color-primary] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[--color-primary]/20"
              title={available ? t('addToCart') : t('buyGamesAddDisabled')}
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </>
    );

    if (listMode) {
      return (
        <Card
          key={p.id}
          className="group flex min-h-[7rem] overflow-hidden border border-[--color-ghost-border] bg-[--color-surface-container-low] p-0 transition-all hover:border-[--color-primary]/35"
        >
          {inner}
        </Card>
      );
    }

    return (
      <Card
        key={p.id}
        className="group flex h-full flex-col overflow-hidden border border-[--color-ghost-border] bg-[--color-surface-container-low] p-0 transition-all hover:border-[--color-primary]/35"
      >
        {inner}
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex-1 bg-[--color-background] bg-[radial-gradient(ellipse_85%_45%_at_50%_-12%,rgba(98,138,255,0.11),transparent)]">
      <header className="border-b border-white/[0.07] bg-[--color-surface-dim]/90 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[--color-primary]/90">{t('buyGames')}</p>
          <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">{t('buyGamesStoreTitle')}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[--color-on-surface-variant]">{t('buyGamesStoreSubtitle')}</p>
        </div>
      </header>

      {loadError && (
        <div className="mx-auto max-w-[1600px] px-4 py-4 text-sm text-[--color-error] sm:px-6 lg:px-8">{loadError}</div>
      )}

      <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 py-8 lg:flex-row lg:gap-10 lg:px-8 lg:py-10">
        <CatalogSidebar section="store" platformOptions={platformOptions}>
          <div className="mt-5 space-y-5 border-t border-white/[0.08] pt-5">
            <DarkFilterSelect label={t('buyGamesFilterGenre')} value={genreId} onChange={setGenreId} options={genreOptions} />
            {genreLoadError && <p className="text-[10px] leading-relaxed text-amber-400/90">{genreLoadError}</p>}
            <DarkFilterSelect
              label={t('buyGamesFilterAvailability')}
              value={stockFilter}
              onChange={(v) => setStockFilter(v as StockFilter)}
              options={stockOptions}
            />
            <div>
              <label className={CATALOG_SIDEBAR_LABEL_CLASS}>{t('buyGamesFilterPrice')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={t('minPrice')}
                  value={minPriceStr}
                  onChange={(e) => setMinPriceStr(e.target.value)}
                  className={CATALOG_SIDEBAR_INPUT_CLASS}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={t('maxPrice')}
                  value={maxPriceStr}
                  onChange={(e) => setMaxPriceStr(e.target.value)}
                  className={CATALOG_SIDEBAR_INPUT_CLASS}
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/90">
              <input
                type="checkbox"
                checked={flashOnly}
                onChange={(e) => setFlashOnly(e.target.checked)}
                className="rounded border-white/20 bg-[--color-surface-container] text-[--color-primary] focus:ring-[--color-primary]/40"
              />
              {t('buyGamesFilterFlashOnly')}
            </label>
          </div>
        </CatalogSidebar>

        <main className="min-w-0 flex-1">
          <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-[--color-surface-container-low]/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:p-5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:gap-4">
              <div className="inline-flex items-baseline gap-2 rounded-full border border-white/[0.1] bg-black/20 px-4 py-2 ring-1 ring-white/[0.04]">
                <span className="text-2xl font-black tabular-nums tracking-tight text-white">{filtered.length}</span>
                <span className="text-xs font-medium uppercase tracking-wider text-[--color-on-surface-variant]">
                  {t('buyGamesResults')}
                </span>
              </div>
              {loading && (
                <span className="flex items-center gap-2 text-xs text-[--color-outline-variant]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[--color-primary]" aria-hidden />
                  {t('loading')}
                </span>
              )}
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
                <DarkFilterSelect
                  layout="inline"
                  label={t('buyGamesSortBy')}
                  value={sort}
                  onChange={(v) => setSort(v as SortKey)}
                  options={sortOptions}
                />
                <div
                  className="flex rounded-xl border border-white/[0.1] bg-black/15 p-1 shadow-inner"
                  role="group"
                  aria-label={`${t('buyGamesViewGrid')} / ${t('buyGamesViewList')}`}
                >
                  <button
                    type="button"
                    onClick={() => setView('grid')}
                    className={`rounded-lg p-2.5 transition-all ${
                      view === 'grid'
                        ? 'bg-[--color-primary]/20 text-[--color-secondary] shadow-[0_0_20px_rgba(98,138,255,0.2)] ring-1 ring-[--color-primary]/35'
                        : 'text-[--color-outline-variant] hover:bg-white/5 hover:text-white'
                    }`}
                    title={t('buyGamesViewGrid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className={`rounded-lg p-2.5 transition-all ${
                      view === 'list'
                        ? 'bg-[--color-primary]/20 text-[--color-secondary] shadow-[0_0_20px_rgba(98,138,255,0.2)] ring-1 ring-[--color-primary]/35'
                        : 'text-[--color-outline-variant] hover:bg-white/5 hover:text-white'
                    }`}
                    title={t('buyGamesViewList')}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
            </div>
          </div>

          {!loading && filtered.length === 0 && !loadError && (
            <div className="rounded-2xl border border-dashed border-white/[0.12] bg-black/10 py-20 text-center">
              <p className="mx-auto max-w-md px-4 text-sm leading-relaxed text-[--color-on-surface-variant]">{t('buyGamesEmptyHint')}</p>
            </div>
          )}

          <div
            className={
              view === 'grid'
                ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                : 'flex flex-col gap-5'
            }
          >
            {filtered.map((p) => renderCard(p, view === 'list'))}
          </div>
        </main>
      </div>
    </div>
  );
}
