import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { CatalogSidebar } from '../components/catalog/CatalogSidebar';
import { getProducts } from '../services/api';
import type { Product, ProductCategory } from '../types';
import { useCart } from '../hooks/useCart.tsx';
import { useLanguage } from '../context/LanguageContext';
import {
  TOPUP_PLATFORM_FILTER_OPTIONS,
  catalogFilterFromSearch,
  catalogLabelKeyForCategory,
  parseProductPrice,
} from '../utils/marketplaceFilters';
import { readCatalogQ } from '../utils/catalogUrl';

export function BuyGameId() {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const platformFilter = useMemo(() => {
    const raw = catalogFilterFromSearch(searchParams);
    if (raw === 'account') return 'all';
    return raw;
  }, [searchParams]);

  const q = useMemo(() => readCatalogQ(searchParams), [searchParams]);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { dispatch: cartDispatch } = useCart();

  const topupPlatformOptions = useMemo(
    () => [
      { value: 'all', label: t('buyGamesFilterAny') },
      ...TOPUP_PLATFORM_FILTER_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    ],
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getProducts({
          category: 'account',
          accountPlatform: platformFilter,
        });
        if (!cancelled) setProducts(list);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'load failed');
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [platformFilter]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return products;
    return products.filter((p) => {
      const name = p.name.toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes(qq) || desc.includes(qq);
    });
  }, [products, q]);

  const platformBadge = (p: Product) => {
    const plat = p.account_platform as ProductCategory | null | undefined;
    if (!plat) return t('buyGameIdAnyPlatform');
    return t(catalogLabelKeyForCategory(plat));
  };

  return (
    <div className="flex-1 min-h-screen bg-[--color-background]">
      <header className="border-b border-white/10 bg-[--color-surface-dim]/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[--color-primary]">{t('navBuyGameId')}</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">{t('buyGameIdTitle')}</h1>
          <p className="mt-2 max-w-xl text-sm text-[--color-on-surface-variant]">{t('buyGameIdSubtitle')}</p>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8 lg:px-8 lg:py-8">
        <CatalogSidebar section="accounts" platformOptions={topupPlatformOptions} />

        <main className="min-w-0 flex-1">
          {loading && <p className="text-on-surface-variant">{t('loading')}</p>}
          {error && <p className="text-[--color-error] text-sm">{error}</p>}
          {!loading && !error && filtered.length === 0 && (
            <p className="py-16 text-center text-on-surface-variant">{t('buyGameIdEmpty')}</p>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product) => {
              const price = parseProductPrice(product.price);
              return (
                <Card
                  key={product.id}
                  className="overflow-hidden border border-[--color-ghost-border] bg-[--color-surface-container-low] transition-all hover:border-[--color-primary]/35"
                >
                  <Link to={`/product/${product.id}`} className="relative block aspect-[16/10] overflow-hidden">
                    <img
                      src={product.image_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                      {platformBadge(product)}
                    </span>
                  </Link>
                  <div className="p-5">
                    <Link to={`/product/${product.id}`}>
                      <h2 className="line-clamp-2 text-lg font-bold text-white transition-colors hover:text-[--color-primary]">
                        {product.name}
                      </h2>
                    </Link>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="font-black text-[--color-primary]">
                        ฿{price.toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          cartDispatch({
                            type: 'ADD_ITEM',
                            payload: {
                              id: crypto.randomUUID(),
                              order_id: '',
                              product_id: product.id,
                              quantity: 1,
                              unit_price: price,
                            },
                          })
                        }
                        className="rounded-lg bg-[--color-primary]/20 p-2 text-[--color-primary] transition-colors hover:bg-[--color-primary] hover:text-white"
                        title={t('addToCart')}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
