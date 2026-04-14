import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { adminDeleteProduct, listAllProductsAdmin } from '../../services/adminApi';
import { useLanguage } from '../../context/LanguageContext';

export function AdminProducts() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listAllProductsAdmin();
      setRows(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((p) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s);
  });

  const remove = async (id: string) => {
    if (!window.confirm(t('adminConfirmDelete'))) return;
    const { ok } = await adminDeleteProduct(id);
    if (ok) void load();
  };

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline text-4xl font-black tracking-tight uppercase"
            style={{ color: 'var(--nc-on-surface)' }}>
            Inventory <span style={{ color: 'var(--nc-primary)' }}>Vault</span>
          </h2>
          <p className="text-sm mt-1 max-w-md opacity-80 uppercase tracking-widest font-medium"
            style={{ color: 'var(--nc-on-surface-variant)' }}>
            {t('adminProductsIntro')} — {rows.length} active digital assets
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className="p-2 rounded transition-colors"
            style={{
              backgroundColor: 'var(--nc-surface-high)',
              color: viewMode === 'grid' ? 'var(--nc-primary)' : 'var(--nc-on-surface-variant)',
            }}
          >
            <span className="material-symbols-outlined">grid_view</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="p-2 rounded transition-colors"
            style={{
              backgroundColor: 'var(--nc-surface-high)',
              color: viewMode === 'list' ? 'var(--nc-primary)' : 'var(--nc-on-surface-variant)',
            }}
          >
            <span className="material-symbols-outlined">view_list</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="rounded-xl p-4 flex flex-wrap items-center gap-6"
        style={{
          backgroundColor: 'var(--nc-surface-low)',
          borderBottom: '1px solid rgba(67,70,84,0.05)',
        }}
      >
        <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-md">
          <span className="text-[10px] font-bold uppercase tracking-tighter ml-1"
            style={{ color: 'rgba(195,198,214,0.6)' }}>
            Search
          </span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--nc-on-surface-variant)' }}>search</span>
            <input
              type="search"
              placeholder={t('adminSearchProducts')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="nc-input pl-10"
              style={{ backgroundColor: 'var(--nc-surface-highest)', border: 'none' }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-tighter ml-1"
            style={{ color: 'rgba(195,198,214,0.6)' }}>
            Category
          </span>
          <div className="flex gap-2">
            {['All Items', 'Top-ups', 'Accounts'].map((cat) => (
              <button
                key={cat}
                className="px-4 py-2 text-[11px] font-bold uppercase rounded-full transition-all"
                style={{
                  backgroundColor: cat === 'All Items' ? 'rgba(180,197,255,0.1)' : 'var(--nc-surface-highest)',
                  color: cat === 'All Items' ? 'var(--nc-primary)' : 'var(--nc-on-surface-variant)',
                  border: cat === 'All Items' ? '1px solid rgba(180,197,255,0.2)' : '1px solid transparent',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-tighter ml-1 text-right"
            style={{ color: 'rgba(195,198,214,0.6)' }}>
            Stock Status
          </span>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-none accent-[var(--nc-primary)]" />
              <span className="text-xs uppercase font-medium" style={{ color: 'var(--nc-on-surface-variant)' }}>In Stock</span>
            </label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center" style={{ color: 'var(--nc-on-surface-variant)' }}>
          <span className="material-symbols-outlined text-4xl mb-2 block animate-spin">progress_activity</span>
          {t('loading')}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-12 gap-6">
          {/* Featured Large Card */}
          {featured && (
            <div className="col-span-12 lg:col-span-8 rounded-2xl overflow-hidden group"
              style={{
                backgroundColor: 'var(--nc-surface-low)',
                border: '1px solid rgba(67,70,84,0.05)',
              }}>
              <div className="flex h-full flex-col md:flex-row">
                <div className="w-full md:w-1/2 relative overflow-hidden h-64 md:h-auto">
                  {featured.image_url ? (
                    <img
                      src={featured.image_url}
                      alt={featured.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--nc-surface-high)' }}>
                      <span className="material-symbols-outlined text-6xl" style={{ color: 'var(--nc-outline-variant)' }}>
                        image
                      </span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                    style={{
                      backgroundColor: 'rgba(0,227,253,0.9)',
                      color: 'var(--nc-on-primary)',
                    }}>
                    Featured
                  </div>
                </div>
                <div className="w-full md:w-1/2 p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--nc-primary)' }}>
                        {featured.category} • {featured.type}
                      </span>
                      <span className="text-xs font-bold" style={{ color: 'var(--nc-on-surface-variant)' }}>
                        ID: #{featured.id.slice(0, 8)}
                      </span>
                    </div>
                    <h3 className="font-headline text-3xl font-bold leading-tight mb-2 uppercase">
                      {featured.name}
                    </h3>
                    <p className="text-sm line-clamp-3 opacity-70" style={{ color: 'var(--nc-on-surface-variant)' }}>
                      {featured.description || 'Digital asset available for immediate delivery.'}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between pt-6"
                    style={{ borderTop: '1px solid rgba(67,70,84,0.1)' }}>
                    <div>
                      <span className="block text-[10px] uppercase font-bold" style={{ color: 'rgba(195,198,214,0.5)' }}>
                        Base Price
                      </span>
                      <span className="text-2xl font-black" style={{ color: 'var(--nc-secondary)' }}>
                        ฿{Number(featured.price).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void remove(featured.id)}
                        className="h-10 w-10 flex items-center justify-center rounded transition-colors"
                        style={{ backgroundColor: 'var(--nc-surface-highest)' }}
                      >
                        <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nc-error)' }}>delete</span>
                      </button>
                      <Link
                        to={`/product/${featured.id}`}
                        className="h-10 px-6 flex items-center justify-center rounded text-[11px] font-bold uppercase tracking-widest transition-colors"
                        style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-on-surface)' }}
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats Side Card */}
          {featured && (
            <div className="col-span-12 lg:col-span-4 rounded-2xl p-8 flex flex-col justify-between"
              style={{
                background: 'linear-gradient(to bottom right, var(--nc-surface-low), var(--nc-bg))',
                border: '1px solid rgba(67,70,84,0.1)',
              }}>
              <div>
                <h4 className="font-headline text-xl font-bold mb-6 uppercase">Quick Stats</h4>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>Total Products</span>
                      <span className="text-sm font-black" style={{ color: 'var(--nc-secondary)' }}>{rows.length}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--nc-surface-highest)' }}>
                      <div className="h-full rounded-full" style={{ width: '92%', backgroundColor: 'var(--nc-secondary)' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>In Stock</span>
                      <span className="text-sm font-black" style={{ color: 'var(--nc-tertiary)' }}>
                        {rows.filter((r) => r.in_stock !== false).length}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--nc-surface-highest)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${rows.length ? (rows.filter((r) => r.in_stock !== false).length / rows.length) * 100 : 0}%`,
                          backgroundColor: 'var(--nc-tertiary)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-4 mt-8" style={{ backgroundColor: 'rgba(26,32,40,0.5)', border: '1px solid rgba(67,70,84,0.05)' }}>
                <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--nc-on-surface-variant)' }}>
                  Category Distribution
                </p>
                <div className="flex items-end gap-1 h-12">
                  {[40, 60, 50, 80, 100].map((h, i) => (
                    <div key={i} className="w-full rounded-t-sm chart-bar"
                      style={{
                        height: `${h}%`,
                        backgroundColor: h === 100 ? 'var(--nc-primary)' : `rgba(180,197,255,${h / 500 + 0.1})`,
                        animationDelay: `${i * 60}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Product Cards */}
          {rest.map((p) => (
            <div
              key={p.id}
              className="col-span-12 md:col-span-6 lg:col-span-3 rounded-xl overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: 'var(--nc-surface-low)',
                border: '1px solid rgba(67,70,84,0.05)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(180,197,255,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(67,70,84,0.05)')}
            >
              <div className="h-40 w-full relative overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--nc-surface-high)' }}>
                    <span className="material-symbols-outlined text-4xl" style={{ color: 'var(--nc-outline-variant)' }}>image</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 backdrop-blur px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest"
                  style={{ backgroundColor: 'rgba(14,20,28,0.8)', color: 'var(--nc-on-surface)' }}>
                  {p.category}
                </div>
                {p.in_stock === false && (
                  <div className="absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--nc-error)' }} />
                )}
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-base truncate mr-2">{p.name}</h4>
                  <span className="text-[10px] font-bold uppercase shrink-0"
                    style={{ color: p.in_stock !== false ? 'var(--nc-secondary)' : 'var(--nc-error)' }}>
                    {p.in_stock !== false ? '✓ Stock' : 'Out'}
                  </span>
                </div>
                <p className="text-xs opacity-60 mb-6" style={{ color: 'var(--nc-on-surface-variant)' }}>
                  {p.description?.slice(0, 60) || p.type}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black">฿{Number(p.price).toFixed(2)}</span>
                  <div className="flex gap-1">
                    <Link
                      to={`/product/${p.id}`}
                      className="p-1.5 rounded transition-colors"
                      style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-on-surface-variant)' }}
                    >
                      <span className="material-symbols-outlined text-xs">visibility</span>
                    </Link>
                    <button
                      onClick={() => void remove(p.id)}
                      className="p-1.5 rounded transition-colors"
                      style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-on-surface-variant)' }}
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
          <table className="nc-table">
            <thead>
              <tr>
                <th>{t('adminColName')}</th>
                <th>{t('adminColCategory')}</th>
                <th>{t('adminColPrice')}</th>
                <th>{t('adminColStock')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded overflow-hidden shrink-0"
                        style={{ backgroundColor: 'var(--nc-surface-highest)' }}>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-xs" style={{ color: 'var(--nc-outline-variant)' }}>image</span>
                          </div>
                        )}
                      </div>
                      <Link to={`/product/${p.id}`} className="font-medium hover:underline" style={{ color: 'var(--nc-secondary)' }}>
                        {p.name}
                      </Link>
                    </div>
                  </td>
                  <td className="text-xs uppercase">{p.category}</td>
                  <td className="tabular-nums font-bold">฿{Number(p.price).toFixed(2)}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.in_stock !== false ? 'badge-completed' : 'badge-flagged'}`}>
                      {p.in_stock !== false ? '✓ In Stock' : '✗ Out'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => void remove(p.id)}
                      className="text-xs font-bold transition-colors"
                      style={{ color: 'var(--nc-error)' }}
                    >
                      {t('adminDelete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-8 py-4 rounded-xl"
        style={{
          backgroundColor: 'var(--nc-surface-low)',
          border: '1px solid rgba(67,70,84,0.05)',
        }}
      >
        <span className="text-xs uppercase tracking-widest font-medium"
          style={{ color: 'var(--nc-on-surface-variant)' }}>
          Showing {filtered.length} of {rows.length} items
        </span>
        <div className="flex items-center gap-1">
          <button className="h-8 w-8 flex items-center justify-center rounded"
            style={{ backgroundColor: 'var(--nc-primary)', color: 'var(--nc-on-primary)' }}>
            <span className="font-bold text-xs">1</span>
          </button>
        </div>
      </div>
    </div>
  );
}
