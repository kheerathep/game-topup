import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getGames } from '../services/games';
import type { Game } from '../types';
import { TOPUP_PLATFORM_FILTER_OPTIONS, catalogFilterFromSearch, catalogLabelKeyForCategory } from '../utils/marketplaceFilters';
import { readCatalogQ } from '../utils/catalogUrl';
import { gameLocalizedDescription } from '../utils/gameCopy';
import { CatalogSidebar } from '../components/catalog/CatalogSidebar';

export function Marketplace() {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const platformFilter = useMemo(() => {
    const raw = catalogFilterFromSearch(searchParams);
    return raw === 'account' ? 'all' : raw;
  }, [searchParams]);

  const q = useMemo(() => readCatalogQ(searchParams), [searchParams]);

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const list = await getGames(platformFilter);
      if (cancelled) return;
      setGames(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [platformFilter]);

  const topupPlatformOptions = useMemo(
    () => [
      { value: 'all', label: t('buyGamesFilterAny') },
      ...TOPUP_PLATFORM_FILTER_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    ],
    [t],
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return games;
    return games.filter((g) => {
      const en = g.name.toLowerCase();
      const th = (g.name_th || '').toLowerCase();
      return en.includes(qq) || th.includes(qq) || g.slug.toLowerCase().includes(qq);
    });
  }, [games, q]);

  const hubSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';

  return (
    <div className="flex-1 min-h-screen bg-[--color-background]">
      <header className="border-b border-white/10 bg-[--color-surface-dim]/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[--color-primary]">{t('gameTopupNav')}</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">{t('gameTopupTitle')}</h1>
          <p className="mt-2 max-w-xl text-sm text-[--color-on-surface-variant]">{t('gameTopupSubtitle')}</p>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8 lg:px-8 lg:py-8">
        <CatalogSidebar section="topup" platformOptions={topupPlatformOptions} />

        <main className="min-w-0 flex-1">
          {loading && <p className="text-on-surface-variant">{t('loading')}</p>}
          {error && <p className="text-[--color-error]">{error}</p>}
          {!loading && filtered.length === 0 && (
            <div className="space-y-4 py-20 text-center">
              <p className="text-on-surface-variant">{t('gameTopupEmpty')}</p>
              <p className="mx-auto max-w-md text-sm text-[--color-outline-variant]">{t('gameTopupEmptyHint')}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map((game) => {
              const title = language === 'th' && game.name_th ? game.name_th : game.name;
              const plat = game.platform ?? 'mobile';
              const desc = gameLocalizedDescription(game, language);
              return (
                <Link
                  key={game.id}
                  to={`/marketplace/${game.slug}${hubSearch}`}
                  className="group relative overflow-hidden rounded-2xl border border-[--color-ghost-border] bg-[--color-surface-container] transition-all duration-300 hover:-translate-y-1 hover:border-[--color-primary]/70 hover:shadow-[0_8px_32px_rgba(98,138,255,0.25)]"
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={game.image_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                      {t(catalogLabelKeyForCategory(plat))}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h2 className="text-xl font-black uppercase tracking-tight text-white transition-colors group-hover:text-[--color-primary]">
                      {title}
                    </h2>
                    {desc && <p className="mt-1 line-clamp-2 text-sm text-[--color-on-surface-variant]">{desc}</p>}
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[--color-primary]">
                      {t('gameTopupEnter')} <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
