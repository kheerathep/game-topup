import { useCallback, useEffect, useState } from 'react';
import { FALLBACK_HOME_HERO, type HomeHeroRow, type HomePlatformRow } from '../../services/home';
import {
  deleteHomePlatform,
  getHomeHeroAdmin,
  listHomePlatformsAdmin,
  updateHomeHero,
  upsertHomePlatform,
} from '../../services/adminApi';
import { useLanguage } from '../../context/LanguageContext';

const emptyPlatform: Omit<HomePlatformRow, 'id'> = {
  sort_order: 0,
  icon_name: 'smartphone',
  label: '',
  href: '/',
  is_active: true,
};

export function AdminBanners() {
  const { t } = useLanguage();
  const [hero, setHero] = useState<HomeHeroRow>(FALLBACK_HOME_HERO);
  const [platforms, setPlatforms] = useState<HomePlatformRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingHero, setSavingHero] = useState(false);
  const [platDraft, setPlatDraft] = useState(emptyPlatform);
  const [platEditId, setPlatEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, pl] = await Promise.all([getHomeHeroAdmin(), listHomePlatformsAdmin()]);
      setHero(h ?? FALLBACK_HOME_HERO);
      setPlatforms(pl);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveHero = async () => {
    setSavingHero(true);
    try {
      const { data } = await updateHomeHero(hero);
      if (data) setHero(data);
    } finally {
      setSavingHero(false);
    }
  };

  const savePlatform = async () => {
    const { error } = await upsertHomePlatform(platEditId ? { id: platEditId, ...platDraft } : { ...platDraft });
    if (!error) {
      setPlatEditId(null);
      setPlatDraft(emptyPlatform);
      void load();
    }
  };

  const editPlat = (p: HomePlatformRow) => {
    setPlatEditId(p.id);
    setPlatDraft({
      sort_order: p.sort_order,
      icon_name: p.icon_name,
      label: p.label,
      href: p.href,
      is_active: p.is_active,
    });
  };

  if (loading) {
    return (
      <div className="py-20 text-center" style={{ color: 'var(--nc-on-surface-variant)' }}>
        <span className="material-symbols-outlined text-4xl mb-2 block animate-spin">progress_activity</span>
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-headline text-4xl font-black tracking-tight uppercase"
            style={{ color: 'var(--nc-on-surface)' }}>
            Banner <span style={{ color: 'var(--nc-primary)' }}>Management</span>
          </h2>
          <p className="text-sm mt-1 max-w-lg" style={{ color: 'var(--nc-on-surface-variant)' }}>
            {t('adminBannersIntro')}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="nc-btn-ghost">
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Filter
          </button>
          <button className="nc-btn-primary">
            <span className="material-symbols-outlined text-sm">add</span>
            New Banner
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Hero Banner & Campaigns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Hero Banner Section */}
          <section className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
            <div className="p-6" style={{ borderBottom: '1px solid rgba(67,70,84,0.1)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nc-secondary)' }}>campaign</span>
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--nc-secondary)' }}>
                  {t('adminHeroTitle')}
                </h3>
              </div>
              <p className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                Main hero banner configuration
              </p>
            </div>

            {/* Hero Preview */}
            {hero.image_url && (
              <div className="relative h-48 overflow-hidden">
                <img src={hero.image_url} alt="Hero" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--nc-bg)] to-transparent" />
                <div className="absolute bottom-4 left-6">
                  <p className="text-[10px] uppercase tracking-widest font-bold"
                    style={{ color: 'var(--nc-secondary)' }}>
                    {hero.eyebrow_en}
                  </p>
                  <p className="text-lg font-headline font-bold mt-1">{hero.headline_en}</p>
                </div>
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest"
                  style={{ backgroundColor: 'rgba(0,227,253,0.9)', color: 'var(--nc-on-primary)' }}>
                  LIVE
                </div>
              </div>
            )}

            {/* Hero Form */}
            <div className="p-6 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ['eyebrow_en', 'eyebrow_th'],
                  ['headline_en', 'headline_th'],
                  ['subheadline_en', 'subheadline_th'],
                  ['primary_label_en', 'primary_label_th'],
                  ['secondary_label_en', 'secondary_label_th'],
                ] as const).map(([a, b]) => (
                  <FragmentRow key={a} a={a} b={b} hero={hero}
                    onChange={(patch) => setHero((h) => ({ ...h, ...patch }))} />
                ))}
                <label className="text-xs sm:col-span-2" style={{ color: 'var(--nc-on-surface-variant)' }}>
                  image_url
                  <input className="nc-input mt-1" value={hero.image_url}
                    onChange={(e) => setHero((h) => ({ ...h, image_url: e.target.value }))} />
                </label>
                <label className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                  primary_href
                  <input className="nc-input mt-1" value={hero.primary_href}
                    onChange={(e) => setHero((h) => ({ ...h, primary_href: e.target.value }))} />
                </label>
                <label className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                  secondary_href
                  <input className="nc-input mt-1" value={hero.secondary_href}
                    onChange={(e) => setHero((h) => ({ ...h, secondary_href: e.target.value }))} />
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" disabled={savingHero} onClick={() => void saveHero()}
                  className="nc-btn-primary">
                  {savingHero ? 'Saving...' : t('adminSaveHero')}
                </button>
                <button className="nc-btn-ghost">Save as Draft</button>
              </div>
            </div>
          </section>

          {/* Platforms / Links List */}
          <section className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
            <div className="p-6 flex justify-between items-center"
              style={{ borderBottom: '1px solid rgba(67,70,84,0.1)' }}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nc-tertiary)' }}>widgets</span>
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--nc-tertiary)' }}>
                  {t('adminPlatformsTitle')}
                </h3>
              </div>
              <span className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                {platforms.length} Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="nc-table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Href</th>
                    <th>Sort</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {platforms.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium">{p.label}</td>
                      <td className="font-mono text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>{p.href}</td>
                      <td>{p.sort_order}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.is_active ? 'badge-completed' : 'badge-cancelled'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="space-x-2">
                        <button type="button" onClick={() => editPlat(p)}
                          className="p-1.5 rounded transition-colors inline-flex"
                          style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-on-surface-variant)' }}>
                          <span className="material-symbols-outlined text-xs">edit</span>
                        </button>
                        <button type="button"
                          onClick={() => { if (window.confirm(t('adminConfirmDelete'))) void deleteHomePlatform(p.id).then(() => load()); }}
                          className="p-1.5 rounded transition-colors inline-flex"
                          style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-error)' }}>
                          <span className="material-symbols-outlined text-xs">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right — Platform Editor Panel */}
        <div className="lg:col-span-2">
          <div className="rounded-xl p-6 sticky top-24 space-y-4"
            style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nc-primary)' }}>
                {platEditId ? 'edit' : 'add_circle'}
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--nc-primary)' }}>
                {platEditId ? 'Edit Platform' : 'Add Platform'}
              </h3>
            </div>

            <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
              Label (unique)
              <input className="nc-input mt-1" value={platDraft.label}
                onChange={(e) => setPlatDraft((d) => ({ ...d, label: e.target.value }))} />
            </label>
            <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
              Icon Name (Material)
              <input className="nc-input mt-1" value={platDraft.icon_name}
                onChange={(e) => setPlatDraft((d) => ({ ...d, icon_name: e.target.value }))} />
            </label>
            <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
              Href
              <input className="nc-input mt-1" value={platDraft.href}
                onChange={(e) => setPlatDraft((d) => ({ ...d, href: e.target.value }))} />
            </label>
            <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
              Sort Order
              <input type="number" className="nc-input mt-1" value={platDraft.sort_order}
                onChange={(e) => setPlatDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))} />
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"
              style={{ color: 'var(--nc-on-surface-variant)' }}>
              <input type="checkbox" checked={platDraft.is_active}
                onChange={(e) => setPlatDraft((d) => ({ ...d, is_active: e.target.checked }))}
                className="rounded accent-[var(--nc-primary)]" />
              {t('adminActive')}
            </label>

            {/* Asset Upload Area (visual only) */}
            <div className="rounded-xl p-6 text-center"
              style={{ border: '2px dashed var(--nc-outline-variant)', backgroundColor: 'var(--nc-surface-high)' }}>
              <span className="material-symbols-outlined text-3xl mb-2 block" style={{ color: 'var(--nc-outline-variant)' }}>
                cloud_upload
              </span>
              <p className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                Drag your artwork here or<br />browse
              </p>
              <p className="text-[9px] mt-1" style={{ color: 'rgba(195,198,214,0.4)' }}>
                Recommended: 1920×600 PNG/JPG
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button type="button" onClick={() => void savePlatform()} className="nc-btn-primary w-full py-3">
                {platEditId ? t('adminSave') : t('adminCreate')}
              </button>
              {platEditId && (
                <button type="button"
                  onClick={() => { setPlatEditId(null); setPlatDraft(emptyPlatform); }}
                  className="nc-btn-ghost w-full">
                  {t('adminCancel')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Stats Footer */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total CTR', value: '12.4%', sub: '+2.1%', color: 'var(--nc-secondary-dim)' },
          { label: 'Impressions', value: '892k', sub: 'Weekly', color: 'var(--nc-on-surface)' },
          { label: 'Conversions', value: '4.1k', sub: 'Direct', color: 'var(--nc-on-surface)' },
          { label: 'Active Slots', value: `${platforms.filter(p => p.is_active).length}/${platforms.length}`, sub: 'Available', color: 'var(--nc-on-surface)' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-6 text-center"
            style={{ backgroundColor: 'var(--nc-surface-low)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[10px] uppercase font-bold tracking-widest mb-2"
              style={{ color: 'var(--nc-on-surface-variant)' }}>{stat.label}</p>
            <p className="text-2xl font-headline font-black" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--nc-on-surface-variant)' }}>{stat.sub}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function FragmentRow({
  a,
  b,
  hero,
  onChange,
}: {
  a: keyof HomeHeroRow;
  b: keyof HomeHeroRow;
  hero: HomeHeroRow;
  onChange: (patch: Partial<HomeHeroRow>) => void;
}) {
  return (
    <>
      <label className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
        {String(a)}
        <input className="nc-input mt-1" value={String(hero[a] ?? '')}
          onChange={(e) => onChange({ [a]: e.target.value } as Partial<HomeHeroRow>)} />
      </label>
      <label className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
        {String(b)}
        <input className="nc-input mt-1" value={String(hero[b] ?? '')}
          onChange={(e) => onChange({ [b]: e.target.value } as Partial<HomeHeroRow>)} />
      </label>
    </>
  );
}
