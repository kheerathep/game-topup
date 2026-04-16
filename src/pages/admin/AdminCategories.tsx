import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameGenre } from '../../types';
import { deleteGameGenre, listGameGenresAdmin, upsertGameGenre } from '../../services/adminApi';
import { useLanguage } from '../../context/LanguageContext';

const emptyDraft: Omit<GameGenre, 'id' | 'created_at'> = {
  slug: '',
  label_en: '',
  label_th: '',
  sort_order: 0,
  is_active: true,
};

export function AdminCategories() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<GameGenre[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listGameGenresAdmin();
      setRows(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (g: GameGenre) => {
    setEditingId(g.id);
    setDraft({
      slug: g.slug,
      label_en: g.label_en,
      label_th: g.label_th,
      sort_order: g.sort_order,
      is_active: g.is_active,
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await upsertGameGenre(
        editingId ? { id: editingId, ...draft } : { ...draft },
      );
      if (!error) {
        setEditingId(null);
        setDraft(emptyDraft);
        void load();
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('adminConfirmDelete'))) return;
    await deleteGameGenre(id);
    void load();
  };

  const activeCount = rows.filter((r) => r.is_active).length;
  const inactiveCount = rows.length - activeCount;

  const displayRows = useMemo(() => {
    return rows.filter((g) => {
      if (statusFilter === 'active' && !g.is_active) return false;
      if (statusFilter === 'inactive' && g.is_active) return false;
      const s = searchQ.trim().toLowerCase();
      if (!s) return true;
      return (
        g.slug.toLowerCase().includes(s) ||
        g.label_en.toLowerCase().includes(s) ||
        g.label_th.toLowerCase().includes(s)
      );
    });
  }, [rows, searchQ, statusFilter]);

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="font-headline text-4xl font-black tracking-tight" style={{ color: 'var(--nc-on-surface)' }}>
          {t('adminNavCategories')}
        </h2>
        <p className="text-sm mt-4" style={{ color: 'var(--nc-on-surface-variant)' }}>
          {t('adminCategoriesIntro')}
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <button
            type="button"
            className="nc-btn-primary"
            onClick={() => {
              setEditingId(null);
              setDraft(emptyDraft);
            }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            {t('adminCreate')}
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`rounded-xl p-6 text-left card-hover admin-stat-filter ${statusFilter === 'all' ? 'admin-stat-filter--selected' : ''}`}
          style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(255,255,255,0.05)' }}
          aria-pressed={statusFilter === 'all'}
        >
          <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--nc-on-surface-variant)' }}>
            {t('adminCategoriesTotal')}
          </p>
          <p className="text-2xl font-headline font-black mt-1" style={{ color: 'var(--nc-on-surface)' }}>
            {rows.length}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('active')}
          className={`rounded-xl p-6 text-left card-hover admin-stat-filter ${statusFilter === 'active' ? 'admin-stat-filter--selected' : ''}`}
          style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(255,255,255,0.05)' }}
          aria-pressed={statusFilter === 'active'}
        >
          <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--nc-on-surface-variant)' }}>
            {t('adminActive')}
          </p>
          <p className="text-2xl font-headline font-black mt-1" style={{ color: 'var(--nc-secondary-dim)' }}>
            {activeCount}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('inactive')}
          className={`rounded-xl p-6 text-left card-hover admin-stat-filter ${statusFilter === 'inactive' ? 'admin-stat-filter--selected' : ''}`}
          style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(255,255,255,0.05)' }}
          aria-pressed={statusFilter === 'inactive'}
        >
          <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--nc-on-surface-variant)' }}>
            {t('adminInactive')}
          </p>
          <p className="text-2xl font-headline font-black mt-1" style={{ color: 'var(--nc-on-surface-variant)' }}>
            {inactiveCount}
          </p>
        </button>
      </section>

      <div
        className="max-w-4xl mx-auto w-full rounded-xl p-4 flex flex-wrap items-end gap-6"
        style={{
          backgroundColor: 'var(--nc-surface-low)',
          border: '1px solid rgba(67,70,84,0.08)',
        }}
      >
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <span className="text-[10px] font-bold uppercase tracking-tighter ml-1" style={{ color: 'rgba(195,198,214,0.6)' }}>
            {t('adminSearchLabel')}
          </span>
          <div className="relative flex items-center">
            <span
              className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 select-none"
              style={{ fontSize: '18px', color: 'var(--nc-on-surface-variant)', lineHeight: 1 }}
              aria-hidden
            >
              search
            </span>
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder={t('adminCategoriesSearch')}
              autoComplete="off"
              className="nc-input nc-input--leading-icon w-full"
              style={{ backgroundColor: 'var(--nc-surface-highest)', border: 'none' }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-tighter ml-1" style={{ color: 'rgba(195,198,214,0.6)' }}>
            {t('adminCategoriesFilterStatus')}
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('adminCategoriesFilterStatus')}>
            {(
              [
                ['all', t('adminFilterAll')] as const,
                ['active', t('adminActive')] as const,
                ['inactive', t('adminInactive')] as const,
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id)}
                aria-pressed={statusFilter === id}
                className={`admin-filter-pill ${statusFilter === id ? 'admin-filter-pill--active' : 'admin-filter-pill--inactive'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}
      >
        <div className="overflow-x-auto">
          <table className="nc-table">
            <thead>
              <tr>
                <th>{t('adminCategoriesColName')}</th>
                <th>{t('adminCategoriesColSlug')}</th>
                <th>{t('adminCategoriesColLabels')}</th>
                <th>{t('adminCategoriesColSort')}</th>
                <th>{t('adminBannerColStatus')}</th>
                <th>{t('adminActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12" style={{ color: 'var(--nc-on-surface-variant)' }}>
                    <span className="material-symbols-outlined text-3xl mb-2 block animate-spin">progress_activity</span>
                    {t('loading')}
                  </td>
                </tr>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>
                    {t('adminCategoriesNoMatch')}
                  </td>
                </tr>
              ) : (
                displayRows.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center"
                          style={{ backgroundColor: 'var(--nc-surface-highest)' }}
                        >
                          <span className="material-symbols-outlined text-xs" style={{ color: 'var(--nc-primary)' }}>
                            label
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm">{g.label_en}</p>
                          <p className="text-[10px]" style={{ color: 'var(--nc-on-surface-variant)' }}>
                            slug: {g.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                      {g.slug}
                    </td>
                    <td className="text-sm">
                      {g.label_en} / {g.label_th}
                    </td>
                    <td>{g.sort_order}</td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${g.is_active ? 'badge-completed' : 'badge-cancelled'}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {g.is_active ? t('adminActive') : t('adminInactive')}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(g)}
                          className="nc-btn-ghost nc-btn-row"
                          aria-label={t('adminEdit')}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                          {t('adminEdit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(g.id)}
                          className="nc-btn-danger nc-btn-row"
                          aria-label={t('adminDelete')}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                          {t('adminDelete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          className="p-4 text-xs"
          style={{ color: 'var(--nc-on-surface-variant)', borderTop: '1px solid rgba(67,70,84,0.1)' }}
        >
          {t('adminCategoriesTableFooterCounts')
            .replace('{shown}', String(displayRows.length))
            .replace('{total}', String(rows.length))}
        </div>
      </div>

      <section>
        <div
          className="rounded-xl p-6 space-y-4 max-w-2xl mx-auto"
          style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-lg">{t('adminGenreForm')}</h3>
            <button
              type="button"
              className="p-1.5 rounded"
              style={{ backgroundColor: 'var(--nc-surface-highest)' }}
              onClick={() => {
                setEditingId(null);
                setDraft(emptyDraft);
              }}
              title={t('adminCancel')}
            >
              <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>
                close
              </span>
            </button>
          </div>

          <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
            Display Name (EN)
            <input
              className="nc-input mt-1"
              value={draft.label_en}
              onChange={(e) => setDraft((d) => ({ ...d, label_en: e.target.value }))}
            />
          </label>
          <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
            Display Name (TH)
            <input
              className="nc-input mt-1"
              value={draft.label_th}
              onChange={(e) => setDraft((d) => ({ ...d, label_th: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
              Slug
              <input
                className="nc-input mt-1"
                value={draft.slug}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
              Sort Order
              <input
                type="number"
                className="nc-input mt-1"
                value={draft.sort_order}
                onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--nc-on-surface-variant)' }}>
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
              className="rounded accent-[var(--nc-primary)]"
            />
            {t('adminActive')}
          </label>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--nc-on-surface-variant)' }}>
            {t('adminCategoryActiveHint')}
          </p>

          <div className="flex gap-3 pt-2">
            <button type="button" disabled={saving} onClick={() => void save()} className="nc-btn-primary flex-1">
              {editingId ? t('adminSave') : t('adminCreate')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyDraft);
                }}
                className="nc-btn-ghost"
              >
                {t('adminCancel')}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
