import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Wallet, ShoppingBag, Gamepad2, Package, ShoppingCart, ChevronRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../hooks/useCart.tsx';
import { getGameBySlug } from '../services/games';
import { getProducts } from '../services/api';
import type { Game, Product } from '../types';
import { OFFER_SECTIONS, productsForOfferKind } from '../utils/gameTopupCatalog';
import { catalogLabelKeyForCategory, parseProductPrice } from '../utils/marketplaceFilters';
import { gameLocalizedDescription } from '../utils/gameCopy';

const SECTION_ICONS = {
  topup_currency: Wallet,
  shop_item: ShoppingBag,
  ingame_item: Gamepad2,
  game_package: Package,
} as const;

export function GameTopupHub() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { t, language } = useLanguage();
  const { dispatch: cartDispatch } = useCart();
  const [game, setGame] = useState<Game | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const g = await getGameBySlug(slug);
      if (cancelled) return;
      if (!g) {
        setGame(null);
        setProducts([]);
        setError('notfound');
        setLoading(false);
        return;
      }
      setGame(g);
      try {
        const rows = await getProducts({ gameId: g.id, excludeProductCategory: 'account' });
        if (!cancelled) setProducts(rows);
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
  }, [slug]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] text-on-surface-variant">
        {t('loading')}
      </div>
    );
  }

  if (!game || error === 'notfound') {
    return (
      <div className="flex-1 max-w-lg mx-auto px-6 py-20 text-center space-y-4">
        <p className="text-white font-bold text-xl">{t('gameTopupNotFound')}</p>
        <Link
          to={`/marketplace${location.search}`}
          className="text-[--color-primary] font-bold uppercase tracking-widest text-sm"
        >
          ← {t('gameTopupNav')}
        </Link>
      </div>
    );
  }

  const displayName = language === 'th' && game.name_th ? game.name_th : game.name;
  const gameDesc = gameLocalizedDescription(game, language);
  const banner = game.banner_url || game.image_url;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex-1 bg-[--color-background] pb-20">
      <div className="relative h-[220px] md:h-[280px] overflow-hidden">
        <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[--color-background] via-[--color-surface-dim]/80 to-[--color-surface-dim]/40" />
        <div className="relative max-w-6xl mx-auto px-6 h-full flex flex-col justify-end pb-8">
          <nav className="text-xs text-[--color-on-surface-variant] mb-3 uppercase tracking-widest">
            <Link to={`/marketplace${location.search}`} className="hover:text-[--color-primary]">
              {t('gameTopupNav')}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-white">{displayName}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/10 text-white border border-white/15">
              {t(catalogLabelKeyForCategory(game.platform ?? 'mobile'))}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">{displayName}</h1>
          {gameDesc && <p className="mt-2 text-on-surface-variant max-w-2xl text-sm md:text-base">{gameDesc}</p>}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-4 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {OFFER_SECTIONS.map((sec) => {
            const Icon = SECTION_ICONS[sec.kind];
            const count = productsForOfferKind(products, sec.kind).length;
            return (
              <button
                key={sec.kind}
                type="button"
                onClick={() => scrollTo(`offer-${sec.anchor}`)}
                className="flex flex-col items-start p-4 md:p-5 rounded-2xl border border-[--color-ghost-border] bg-[--color-surface-container] hover:border-[--color-primary]/45 hover:bg-[--color-surface-container-high] transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[--color-primary]/15 flex items-center justify-center text-[--color-primary] mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-bold text-white text-sm md:text-base leading-tight">{t(sec.titleKey)}</span>
                <span className="text-[11px] text-[--color-on-surface-variant] mt-1 line-clamp-2">{t(sec.descKey)}</span>
                <span className="text-[10px] font-bold text-[--color-primary] mt-2 uppercase tracking-wider">
                  {count} {t('gameTopupItems')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && error !== 'notfound' && (
        <p className="max-w-6xl mx-auto px-6 mt-6 text-sm text-[--color-error]">{error}</p>
      )}

      <div className="max-w-6xl mx-auto px-6 mt-12 space-y-16">
        {OFFER_SECTIONS.map((sec) => {
          const list = productsForOfferKind(products, sec.kind);
          if (list.length === 0) return null;
          return (
            <section key={sec.kind} id={`offer-${sec.anchor}`} className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-6 border-b border-[--color-ghost-border] pb-4">
                <span className="text-[--color-primary] font-black uppercase tracking-[0.2em] text-xs">{t(sec.titleKey)}</span>
              </div>
              <p className="text-sm text-on-surface-variant mb-6 -mt-2">{t(sec.descKey)}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {list.map((product) => {
                  const price = parseProductPrice(product.price);
                  return (
                    <Card
                      key={product.id}
                      className="overflow-hidden bg-[--color-surface-container-low] border border-[--color-ghost-border] group"
                    >
                      <Link to={`/product/${product.id}`} className="block aspect-[4/3] overflow-hidden relative">
                        <img
                          src={product.image_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </Link>
                      <div className="p-4">
                        <Link to={`/product/${product.id}`}>
                          <h3 className="font-bold text-white text-sm line-clamp-2 group-hover:text-[--color-primary] transition-colors">
                            {product.name}
                          </h3>
                        </Link>
                        <div className="mt-4 flex items-center justify-between gap-2">
                          <span className="text-[--color-primary] font-black">฿{price.toLocaleString()}</span>
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
                            className="p-2 rounded-lg bg-[--color-primary]/20 text-[--color-primary] hover:bg-[--color-primary] hover:text-white transition-colors"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                        </div>
                        <Link
                          to={`/product/${product.id}`}
                          className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[--color-on-surface-variant] hover:text-white"
                        >
                          {t('gameTopupDetail')} <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}

        {products.length === 0 && !loading && (
          <p className="text-center text-on-surface-variant py-12">{t('gameTopupNoProducts')}</p>
        )}
      </div>
    </div>
  );
}
