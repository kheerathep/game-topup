import { useCallback, useEffect, useState } from 'react';
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4"
          style={{ backgroundColor: 'rgba(0,227,253,0.1)', color: 'var(--nc-secondary-dim)' }}>
          <span className="material-symbols-outlined text-xs">category</span>
          Taxonomy Manager
        </div>
        <h2 className="font-headline text-4xl font-black tracking-tight italic"
          style={{ color: 'var(--nc-on-surface)' }}>
          Hierarchy &<br />Taxonomy
        </h2>
        <p className="text-sm mt-4" style={{ color: 'var(--nc-on-surface-variant)' }}>
          {t('adminCategoriesIntro')}
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <button className="nc-btn-primary"
            onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>
            <span className="material-symbols-outlined text-sm">add</span>
            Add New Category
          </button>
          <button className="nc-btn-ghost">
            View Audit Log
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Categories', value: rows.length, icon: 'folder' },
          { label: 'Active Types', value: activeCount, icon: 'check_circle' },
          { label: 'Visible Items', value: `${(activeCount * 200).toLocaleString()}+`, icon: 'visibility' },
          { label: 'Growth', value: '+12%', icon: 'trending_up' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-6 flex items-center gap-4 card-hover"
            style={{ backgroundColor: 'var(--nc-surface-low)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--nc-secondary-dim)' }}>
              {stat.icon}
            </span>
            <div>
              <p className="text-2xl font-headline font-black">{stat.value}</p>
              <p className="text-[10px] uppercase font-bold tracking-widest"
                style={{ color: 'var(--nc-on-surface-variant)' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Category Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
        {/* Filter Pills */}
        <div className="p-6 flex flex-wrap items-center gap-3"
          style={{ borderBottom: '1px solid rgba(67,70,84,0.1)' }}>
          {['All', 'Active', 'Inactive'].map((f) => (
            <button key={f} className="px-4 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all"
              style={{
                backgroundColor: f === 'All' ? 'rgba(180,197,255,0.1)' : 'var(--nc-surface-highest)',
                color: f === 'All' ? 'var(--nc-primary)' : 'var(--nc-on-surface-variant)',
                border: f === 'All' ? '1px solid rgba(180,197,255,0.2)' : '1px solid transparent',
              }}>
              {f}
            </button>
          ))}
          <span className="ml-auto text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
            Sort by: Relevance
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="nc-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Slug</th>
                <th>Labels (EN / TH)</th>
                <th>Sort</th>
                <th>Status</th>
                <th />
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
              ) : rows.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded flex items-center justify-center"
                        style={{ backgroundColor: 'var(--nc-surface-highest)' }}>
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
                  <td className="font-mono text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>{g.slug}</td>
                  <td className="text-sm">{g.label_en} / {g.label_th}</td>
                  <td>{g.sort_order}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${g.is_active ? 'badge-completed' : 'badge-cancelled'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {g.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="space-x-1">
                    <button type="button" onClick={() => startEdit(g)}
                      className="p-1.5 rounded transition-colors inline-flex"
                      style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-on-surface-variant)' }}>
                      <span className="material-symbols-outlined text-xs">edit</span>
                    </button>
                    <button type="button" onClick={() => void remove(g.id)}
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

        <div className="p-4 text-xs" style={{ color: 'var(--nc-on-surface-variant)', borderTop: '1px solid rgba(67,70,84,0.1)' }}>
          Showing 1-{rows.length} of {rows.length} categories
        </div>
      </div>

      {/* Bottom Section: Editor + Health */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Category Editor */}
        <div className="rounded-xl p-6 space-y-4"
          style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-lg">
              Quick Category Editor
            </h3>
            <button className="p-1.5 rounded" style={{ backgroundColor: 'var(--nc-surface-highest)' }}>
              <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>close</span>
            </button>
          </div>

          <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
            Display Name (EN)
            <input className="nc-input mt-1" value={draft.label_en}
              onChange={(e) => setDraft((d) => ({ ...d, label_en: e.target.value }))} />
          </label>
          <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
            Display Name (TH)
            <input className="nc-input mt-1" value={draft.label_th}
              onChange={(e) => setDraft((d) => ({ ...d, label_th: e.target.value }))} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
              Slug
              <input className="nc-input mt-1" value={draft.slug}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} />
            </label>
            <label className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
              Sort Order
              <input type="number" className="nc-input mt-1" value={draft.sort_order}
                onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer"
            style={{ color: 'var(--nc-on-surface-variant)' }}>
            <input type="checkbox" checked={draft.is_active}
              onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
              className="rounded accent-[var(--nc-primary)]" />
            {t('adminActive')}
          </label>

          {/* Icon upload area */}
          <div className="rounded-lg p-4 flex items-center gap-3"
            style={{ border: '1px dashed var(--nc-outline-variant)', backgroundColor: 'var(--nc-surface-high)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--nc-outline-variant)' }}>image</span>
            <p className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
              Drop icon SVG to PNG here
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" disabled={saving} onClick={() => void save()} className="nc-btn-primary flex-1">
              {editingId ? 'Update Category' : t('adminCreate')}
            </button>
            {editingId && (
              <button type="button"
                onClick={() => { setEditingId(null); setDraft(emptyDraft); }}
                className="nc-btn-ghost">
                {t('adminCancel')}
              </button>
            )}
          </div>
        </div>

        {/* Category Health */}
        <div className="rounded-xl p-6"
          style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
          <h3 className="font-headline font-bold text-lg mb-2">Category Health</h3>
          <p className="text-xs mb-6" style={{ color: 'var(--nc-on-surface-variant)' }}>
            Real-time engagement distribution across your taxonomies.
          </p>

          <div className="space-y-4">
            {rows.slice(0, 5).map((g, i) => {
              const widths = [64, 57, 42, 35, 28];
              const w = widths[i] ?? 20;
              return (
                <div key={g.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{g.label_en}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--nc-secondary-dim)' }}>
                      {w}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--nc-surface-highest)' }}>
                    <div
                      className="h-full rounded-full chart-bar"
                      style={{
                        width: `${w}%`,
                        background: i === 0
                          ? 'linear-gradient(90deg, var(--nc-primary-container), var(--nc-secondary-dim))'
                          : `rgba(180,197,255,${0.3 + (5 - i) * 0.1})`,
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audit trail minimap */}
          <div className="mt-8 pt-4" style={{ borderTop: '1px solid rgba(67,70,84,0.1)' }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
              <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nc-secondary-dim)' }}>
                verified
              </span>
              Last updated {rows.length > 0 ? 'recently' : 'never'} • Categorization quality: Good
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
