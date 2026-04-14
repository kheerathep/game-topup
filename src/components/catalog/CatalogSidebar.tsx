import { NavLink, useSearchParams } from 'react-router-dom';
import { Search, Gamepad2, ShoppingBag, Fingerprint, Zap } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { DarkFilterSelect, type DarkFilterOption } from '../ui/DarkFilterSelect';
import { catalogSectionHref, readCatalogQ, setCatalogQ } from '../../utils/catalogUrl';
import { catalogFilterFromSearch, type CatalogFilterValue } from '../../utils/marketplaceFilters';
import { cn } from '../../lib/utils';

export const CATALOG_SIDEBAR_INPUT_CLASS =
  'w-full rounded-xl border border-white/15 bg-[--color-surface-container-highest] px-3 py-3 pl-10 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none [color-scheme:dark] placeholder:text-[--color-outline-variant] focus:border-[--color-primary]/45 focus:ring-2 focus:ring-[--color-primary]/30';

export const CATALOG_SIDEBAR_LABEL_CLASS =
  'mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-[--color-outline-variant]';

export type CatalogSidebarSection = 'topup' | 'store' | 'accounts';

type Props = {
  section: CatalogSidebarSection;
  /** ตัวเลือกแพลตฟอร์ม — หน้า store ไม่รวม account */
  platformOptions: DarkFilterOption[];
  children?: React.ReactNode;
};

function platformValueForSection(section: CatalogSidebarSection, sp: URLSearchParams): CatalogFilterValue {
  const raw = catalogFilterFromSearch(sp);
  if (section === 'accounts' && raw === 'account') return 'all';
  if (section === 'store' && raw === 'account') return 'all';
  return raw;
}

export function CatalogSidebar({ section, platformOptions, children }: Props) {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = readCatalogQ(searchParams);
  const platformVal = platformValueForSection(section, searchParams);
  const platformKey = platformVal === 'all' ? 'all' : platformVal;

  const setPlatform = (value: string) => {
    const v = value as CatalogFilterValue;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('platform');
        if (v === 'all') next.delete('category');
        else next.set('category', v);
        return next;
      },
      { replace: true },
    );
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors',
      isActive
        ? 'border-[--color-primary]/50 bg-[--color-primary]/15 text-[--color-secondary]'
        : 'border-white/10 bg-[--color-surface-container]/50 text-white/85 hover:border-white/20 hover:bg-[--color-surface-container-high]',
    );

  const sp = searchParams;

  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-72 lg:self-start">
      <div className="rounded-2xl border border-white/[0.08] bg-[--color-surface-container-low]/95 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[--color-primary]">{t('catalogSidebarBrowse')}</p>

        <nav className="mb-6 flex flex-col gap-2" aria-label={t('catalogSidebarNav')}>
          <NavLink to={catalogSectionHref('/marketplace', sp)} className={navClass} end>
            <Zap className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <span>{t('gameTopupNav')}</span>
          </NavLink>
          <NavLink to={catalogSectionHref('/buy-games', sp)} className={navClass}>
            <ShoppingBag className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <span>{t('buyGames')}</span>
          </NavLink>
          <NavLink to={catalogSectionHref('/buy-game-id', sp)} className={navClass}>
            <Fingerprint className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <span>{t('navBuyGameId')}</span>
          </NavLink>
        </nav>

        <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[--color-outline-variant]">{t('buyGamesFilters')}</p>

        <div className="mb-5">
          <label className={CATALOG_SIDEBAR_LABEL_CLASS} htmlFor="catalog-sidebar-q">
            {t('buyGamesFilterSearch')}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-outline-variant]" />
            <input
              id="catalog-sidebar-q"
              type="search"
              value={q}
              onChange={(e) => setCatalogQ(setSearchParams, e.target.value)}
              placeholder={t('catalogSidebarSearchPlaceholder')}
              className={CATALOG_SIDEBAR_INPUT_CLASS}
            />
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-white/10 bg-[--color-surface-container]/40 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[--color-outline-variant]">{t('buyGamesFilterCategory')}</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
            {section === 'topup' && (
              <>
                <Gamepad2 className="h-4 w-4 text-[--color-primary]" aria-hidden />
                {t('gameTopupNav')}
              </>
            )}
            {section === 'store' && (
              <>
                <ShoppingBag className="h-4 w-4 text-[--color-primary]" aria-hidden />
                {t('buyGamesFilterCategoryGames')}
              </>
            )}
            {section === 'accounts' && (
              <>
                <Fingerprint className="h-4 w-4 text-[--color-primary]" aria-hidden />
                {t('buyGameIdTitle')}
              </>
            )}
          </p>
        </div>

        <div className="mb-1">
          <DarkFilterSelect
            label={t('buyGamesFilterPlatform')}
            value={platformKey}
            onChange={setPlatform}
            options={platformOptions}
          />
        </div>

        {children}
      </div>
    </aside>
  );
}
