import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useHomePage } from '../hooks/useHomePage';
import { useLanguage } from '../context/LanguageContext';
import type { Product } from '../types';
import { CATALOG_CATEGORY_OPTIONS } from '../utils/marketplaceFilters';

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

function HeroLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        className={className}
        style={style}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className} style={style}>
      {children}
    </Link>
  );
}

function productPriceNumber(price: Product['price']): number {
  if (typeof price === 'number' && Number.isFinite(price)) return price;
  const n = parseFloat(String(price));
  return Number.isFinite(n) ? n : 0;
}

const IMG_TOPUP =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCWOm-gcXVVfggkOo--lz59RrbTP0-l00guK8q5mGvdNLDlPJA9veLJ2giAWbAbBUf5MHe6qqYrEnpXv_ruraJ0B1jWSHP6eaMIyV9sX-1FipoG6h-to2P7pyBKjQidAecUXMzykYoV24_aQcvET8lQrnhwzApL4WY4Z4p9B1T_LvcXUbZmrpUQjE1byIyB1o-eHJdgFRXrxSSaKHtSdcVxdfKDEP-y-73wvHyISlFicbiX_uocodfGuHdWp46ISHMu1J8RAKRdbq0R';
const IMG_ID_GAME =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDCDJ0UtGstJPTAcEN927XwLzAnedqY7zNXqqYeAv5pR0GNhQr5Kbkov2jrmLDzZDoxoUKvwDOze0hLL8_e0qkMaRlufXU-tOlwj80Lvf3wxumII9sEvpIAxDgJrRo9X2v4ZqzXaZPezz1gb9HkSh0zC2d6x9gcLcZoDnpDZUEKd7k5PSCl4UA3F9C6-PaEpe6lkTJ9xQvSKvyZpJ9Ky-EEzIPEEP9RgA_rFeKpn1b2U66HNUFa3dA3AOga8hs0zJotj8PvxS-DW9gt';
const IMG_BUY_GAMES =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB6-WH9OfUJoqoslMnAsVzitsTG5ZjecCXdKPOAHs4caMvZZCTMSUD6zKyFtgAvszeBb3Eex4yzDKsvL_zAzAfUEzgGfrEkorAxJeG_fgSSz3Bltug8X4Y720aYb3lRGFq29M_rMZdEl6FlV95r1eZ0qLVyMekMJivCFHKhWdBa3xxw6E_YsxRX2-_AmFHyL2RRRyTZRWo3unjXBC-xqP0CiVtUledC25mE9kbO2W6GSnEZC2x-w_ZGxFADnNgqbii2zTcCW5lk67PW';

const HOME_SERVICE_CARDS = [
  { href: '/marketplace', titleKey: 'homeCatGameTopupTitle', subKey: 'homeCatGameTopupSub', bg: IMG_TOPUP },
  { href: '/buy-game-id', titleKey: 'homeCatIdGameTitle', subKey: 'homeCatIdGameSub', bg: IMG_ID_GAME },
  { href: '/buy-games', titleKey: 'homeCatBuyGameTitle', subKey: 'homeCatBuyGameSub', bg: IMG_BUY_GAMES },
] as const;

export function Home() {
  const { products, isLoading, error } = useProducts();
  const { hero, loading: homeLoading } = useHomePage();
  const { t } = useLanguage();

  return (
    <div className="flex-grow">
      <section className="px-6 py-8 max-w-screen-2xl mx-auto">
        <div className="relative h-[500px] rounded-xl overflow-hidden group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url(${JSON.stringify(hero.imageUrl)})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[--color-surface-dim] via-[--color-surface-dim]/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-12 space-y-6">
            <span className="text-[--color-secondary] font-label uppercase tracking-[0.2em] font-bold">
              {hero.eyebrow}
            </span>
            <h1 className="text-6xl font-black text-white leading-tight max-w-2xl">{hero.headline}</h1>
            <p className="text-[--color-on-surface-variant] text-xl max-w-lg">{hero.subheadline}</p>
            <div className="flex flex-wrap gap-4">
              <HeroLink
                href={hero.primaryHref}
                className="inline-flex items-center justify-center bg-gradient-to-r from-[--color-primary] to-[--color-primary-container] text-white font-bold px-8 py-3 rounded-md active:scale-95 transition-transform uppercase tracking-widest text-xs"
              >
                {hero.primaryLabel}
              </HeroLink>
              <HeroLink
                href={hero.secondaryHref}
                className="inline-flex items-center justify-center glass-panel text-white font-bold px-8 py-3 rounded-md border border-[--color-outline-variant]/20 active:scale-95 transition-transform uppercase tracking-widest text-xs"
                style={{ background: 'rgba(52, 58, 66, 0.6)', backdropFilter: 'blur(12px)' }}
              >
                {hero.secondaryLabel}
              </HeroLink>
            </div>
            {homeLoading && (
              <span className="text-xs text-[--color-on-surface-variant]">{t('homeConfigLoading')}</span>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 max-w-screen-2xl mx-auto">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white tracking-tight">{t('homeMainCategoriesTitle')}</h2>
          <div className="h-1 w-24 bg-[--color-primary] mt-3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOME_SERVICE_CARDS.map((card) => (
            <Link
              key={card.href}
              to={card.href}
              className="relative rounded-xl overflow-hidden group cursor-pointer min-h-[280px] block focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
            >
              <div
                className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700"
                style={{ backgroundImage: `url(${JSON.stringify(card.bg)})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-2xl font-bold text-white">{t(card.titleKey)}</h3>
                <p className="text-slate-300 text-sm mt-2 leading-relaxed">{t(card.subKey)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[--color-surface-container-low] py-20 px-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-center justify-between mb-12 flex-wrap gap-4">
            <h2 className="text-3xl font-bold text-white tracking-tight">{t('homeTrendingLine')}</h2>
            <Link
              to="/marketplace"
              className="text-[--color-primary] font-label uppercase text-sm tracking-widest hover:text-white transition-colors"
            >
              {t('gameTopupNav')}
            </Link>
          </div>

          {isLoading && (
            <div className="text-center text-on-surface-variant py-12">{t('loading')}</div>
          )}
          {error && (
            <div className="text-center text-[--color-error] py-8">{error}</div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {products.slice(0, 4).map((product: Product) => (
              <div
                key={product.id}
                className="bg-[--color-surface-container] rounded-lg overflow-hidden group border border-[--color-outline-variant]/10"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={product.image_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-[--color-primary] text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase">
                    {t(CATALOG_CATEGORY_OPTIONS.find((o) => o.value === product.category)?.labelKey ?? 'catalogAll')}
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-bold text-lg mb-1 truncate text-white">{product.name}</h4>
                  <p className="text-[--color-on-surface-variant] text-sm mb-4">
                    {t(product.type === 'topup' ? 'productTypeTopup' : 'productTypeAccount')}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[--color-primary] font-bold text-xl">
                      ฿{productPriceNumber(product.price).toFixed(2)}
                    </span>
                    <Link
                      to={`/product/${product.id}`}
                      className="cursor-pointer p-2 rounded-lg bg-[--color-surface-container-highest] text-[--color-primary] hover:-translate-y-0.5 hover:scale-105 hover:bg-[--color-primary] hover:text-white active:scale-95 transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(98,138,255,0.4)]"
                      title={t('addToCart')}
                    >
                      <span className="material-symbols-outlined" aria-hidden>
                        add_shopping_cart
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 max-w-screen-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-12 text-center text-white tracking-tight">
          {t('homeDigitalSectionTitle')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products
            .filter((p) => p.category === 'account')
            .slice(0, 4)
            .map((p) => (
              <Link
                key={p.id}
                to={`/product/${p.id}`}
                className="p-6 rounded-xl bg-[--color-surface-container] border border-[--color-outline-variant]/15 hover:border-[--color-primary]/40 hover:scale-[1.02] transition-all shadow-xl block"
              >
                <div className="flex justify-between items-start mb-8">
                  <span className="font-bold text-xl text-white truncate pr-2">{p.name}</span>
                  <span className="material-symbols-outlined text-white/50 shrink-0" aria-hidden>
                    token
                  </span>
                </div>
                {p.description && <p className="text-white/70 text-sm mb-2 line-clamp-2">{p.description}</p>}
                <p className="text-white font-bold text-2xl">฿{productPriceNumber(p.price).toFixed(2)}</p>
              </Link>
            ))}
          {products.filter((p) => p.category === 'account').length === 0 && !isLoading && (
            <div className="col-span-full text-center text-on-surface-variant py-8">
              <Link
                to="/buy-game-id"
                className="text-[--color-primary] font-bold uppercase tracking-widest text-sm"
              >
                {t('homeCatIdGameTitle')} — {t('catalogAccount')}
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
