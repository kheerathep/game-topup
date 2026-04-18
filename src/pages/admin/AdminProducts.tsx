import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { Product, ProductCategory } from '../../types';
import type { ProductInsert } from '../../services/api';
import { adminDeleteProduct, listAllProductsAdmin, adminCreateProduct, adminUpdateProduct } from '../../services/adminApi';
import { uploadCatalogImage } from '../../services/storageUpload';
import { useLanguage } from '../../context/LanguageContext';

const CATEGORY_ORDER: ProductCategory[] = ['mobile', 'pc', 'account', 'playstation', 'xbox', 'switch'];

const catLabelShort: Record<ProductCategory, string> = {
  mobile: 'mob',
  pc: 'pc',
  account: 'acct',
  playstation: 'PS',
  xbox: 'XB',
  switch: 'SW',
};

const emptyDraft: Partial<Product> = {
  name: '',
  description: '',
  price: 0,
  image_url: '',
  gallery_urls: [],
  category: 'mobile',
  type: 'topup',
  in_stock: true,
  track_inventory: false,
  stock_quantity: 0,
  is_flash_sale: false,
  is_bundle: false,
};

function AdminProductStockBadge({
  p,
  t,
  align = 'end',
}: {
  p: Product;
  t: (key: string) => string;
  align?: 'end' | 'center';
}) {
  const ta = align === 'center' ? 'text-center' : 'text-right';
  if (p.track_inventory) {
    const q = p.stock_quantity ?? 0;
    if (q <= 0) {
      return (
        <span
          className={`text-[10px] font-bold uppercase shrink-0 max-w-[10rem] leading-tight ${ta}`}
          style={{ color: 'var(--nc-error)' }}
        >
          {t('adminStockOutShort')}
        </span>
      );
    }
    return (
      <span
        className={`text-[10px] font-bold shrink-0 max-w-[10rem] leading-tight ${ta}`}
        style={{ color: 'var(--nc-secondary)' }}
        title={t('adminStockDeductHint')}
      >
        <span className="opacity-80 uppercase tracking-wider">{t('adminStockRemaining')}</span>{' '}
        <span className="tabular-nums text-sm align-middle">{q}</span>{' '}
        <span className="opacity-70 uppercase">{t('adminStockPieces')}</span>
      </span>
    );
  }
  return (
    <span
      className={`text-[10px] font-bold uppercase shrink-0 max-w-[10rem] leading-tight ${ta}`}
      style={{ color: 'var(--nc-tertiary)' }}
      title={t('adminStockDeductHint')}
    >
      {t('adminStockUnlimitedShort')}
    </span>
  );
}

export function AdminProducts() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'topup' | 'account'>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Editor State
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Product>>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Refs for hidden file inputs
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  const filtered = useMemo(() => {
    return rows.filter((p) => {
      if (typeFilter === 'topup' && p.type !== 'topup') return false;
      if (typeFilter === 'account' && p.type !== 'account') return false;
      if (inStockOnly && p.in_stock === false) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s);
    });
  }, [rows, q, typeFilter, inStockOnly]);

  /** จำนวนสินค้าต่อหมวดจากรายการที่ผ่านตัวกรอง — กราฟ Category Distribution */
  const categoryDistribution = useMemo(() => {
    const counts = CATEGORY_ORDER.map((c) => filtered.filter((p) => p.category === c).length);
    const max = Math.max(...counts, 0);
    return CATEGORY_ORDER.map((cat, i) => {
      const count = counts[i];
      const barPct = max === 0 ? 0 : Math.max(10, Math.round((count / max) * 100));
      return { cat, count, barPct };
    });
  }, [filtered]);

  const maxCategoryCount = useMemo(
    () => Math.max(...categoryDistribution.map((d) => d.count), 0),
    [categoryDistribution],
  );

  const remove = async (id: string) => {
    if (!window.confirm(t('adminConfirmDelete'))) return;
    const { ok } = await adminDeleteProduct(id);
    if (ok) void load();
  };

  const openEditor = (p?: Product) => {
    if (p) {
      setEditingId(p.id);
      setDraft({
        ...p,
        gallery_urls: p.gallery_urls || [],
        track_inventory: p.track_inventory ?? false,
        stock_quantity: p.stock_quantity ?? 0,
      });
    } else {
      setEditingId(null);
      setDraft({ ...emptyDraft });
    }
    setPanelOpen(true);
  };

  const closeEditor = () => {
    setPanelOpen(false);
    setEditingId(null);
    setDraft({ ...emptyDraft });
  };

  const handleSave = async () => {
    if (!draft.name || !draft.category || !draft.type) {
      alert('Please fill in Name, Category, and Type.');
      return;
    }
    setSaving(true);
    try {
      const track = draft.track_inventory === true;
      const sq = Math.max(0, Math.floor(Number(draft.stock_quantity) || 0));
      const payload = {
        name: draft.name,
        description: draft.description || '',
        price: Number(draft.price) || 0,
        image_url: draft.image_url || '',
        gallery_urls: draft.gallery_urls || [],
        category: draft.category as ProductCategory,
        type: draft.type as 'topup' | 'account',
        track_inventory: track,
        stock_quantity: sq,
        in_stock: track ? sq > 0 : draft.in_stock !== false,
        is_flash_sale: draft.is_flash_sale,
        is_bundle: draft.is_bundle,
      };

      if (editingId) {
        const { error } = await adminUpdateProduct(editingId, payload);
        if (error) throw error;
      } else {
        const { error } = await adminCreateProduct(payload as ProductInsert);
        if (error) throw error;
      }
      closeEditor();
      void load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    try {
      const url = await uploadCatalogImage(file, 'products');
      setDraft((d) => ({ ...d, image_url: url }));
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingMain(false);
      if (mainImageInputRef.current) mainImageInputRef.current.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingGallery(true);
    try {
      // Upload all selected files concurrently
      const uploadPromises = files.map(file => uploadCatalogImage(file, 'products'));
      const urls = await Promise.all(uploadPromises);
      setDraft((d) => ({
        ...d,
        gallery_urls: [...(d.gallery_urls || []), ...urls]
      }));
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to upload gallery images');
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const removeGalleryImage = (indexToRemove: number) => {
    setDraft((d) => ({
      ...d,
      gallery_urls: (d.gallery_urls || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 relative">
      {/* Header — compact on mobile, full hero on md+ */}
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="min-w-0">
          <h2
            className="font-headline text-2xl leading-[1.1] font-black tracking-tight uppercase sm:text-3xl md:text-4xl"
            style={{ color: 'var(--nc-on-surface)' }}
          >
            Inventory <span style={{ color: 'var(--nc-primary)' }}>Vault</span>
          </h2>
          <p
            className="mt-1 max-w-2xl text-[11px] font-medium uppercase leading-snug tracking-wide opacity-90 sm:text-xs sm:tracking-widest md:text-sm"
            style={{ color: 'var(--nc-on-surface-variant)' }}
          >
            {t('adminProductsIntro')} — {rows.length} active digital assets
          </p>
          <p
            className="mt-1 max-w-3xl text-[10px] font-normal leading-snug text-balance opacity-80 sm:text-[11px] md:mt-1.5"
            style={{ color: 'var(--nc-on-surface-variant)' }}
          >
            {t('adminStockDeductHint')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3 md:justify-end">
          <button
            type="button"
            onClick={() => openEditor()}
            className="nc-btn-primary min-h-[2.5rem] flex-1 min-[400px]:flex-initial sm:min-h-0"
          >
            <span className="material-symbols-outlined mr-1.5 sm:mr-2" style={{ fontSize: '18px' }}>
              add
            </span>
            Add Product
          </button>

          <div
            className="flex shrink-0 gap-1 rounded-lg p-1 sm:gap-2"
            style={{ backgroundColor: 'var(--nc-surface-high)' }}
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className="cursor-pointer rounded px-2.5 py-1.5 transition-colors hover:brightness-110 sm:px-3"
              style={{
                backgroundColor: viewMode === 'grid' ? 'var(--nc-bg)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--nc-primary)' : 'var(--nc-on-surface-variant)',
              }}
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                grid_view
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="cursor-pointer rounded px-2.5 py-1.5 transition-colors hover:brightness-110 sm:px-3"
              style={{
                backgroundColor: viewMode === 'list' ? 'var(--nc-bg)' : 'transparent',
                color: viewMode === 'list' ? 'var(--nc-primary)' : 'var(--nc-on-surface-variant)',
              }}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                view_list
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="flex flex-col gap-4 rounded-xl p-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-6 sm:gap-y-4 sm:p-4"
        style={{
          backgroundColor: 'var(--nc-surface-low)',
          borderBottom: '1px solid rgba(67,70,84,0.05)',
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-md">
          <span className="text-[10px] font-bold uppercase tracking-tighter ml-1"
            style={{ color: 'rgba(195,198,214,0.6)' }}>
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
              placeholder={t('adminSearchProducts')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              className="nc-input nc-input--leading-icon w-full"
              style={{ backgroundColor: 'var(--nc-surface-highest)', border: 'none' }}
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1 sm:flex-1">
          <span
            className="ml-1 text-[10px] font-bold uppercase tracking-tighter"
            style={{ color: 'rgba(195,198,214,0.6)' }}
          >
            {t('adminFilterCategoryLabel')}
          </span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2" role="group" aria-label={t('adminFilterCategoryLabel')}>
            {(
              [
                ['all', t('adminFilterAllItems')] as const,
                ['topup', t('adminFilterTopups')] as const,
                ['account', t('adminFilterAccounts')] as const,
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTypeFilter(id)}
                aria-pressed={typeFilter === id}
                className={`admin-filter-pill ${typeFilter === id ? 'admin-filter-pill--active' : 'admin-filter-pill--inactive'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1 border-t border-white/5 pt-3 sm:ml-auto sm:border-t-0 sm:pt-0 sm:min-w-[140px]">
          <span
            className="ml-1 text-[10px] font-bold uppercase tracking-tighter sm:text-right"
            style={{ color: 'rgba(195,198,214,0.6)' }}
          >
            {t('adminFilterStockLabel')}
          </span>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-white/5 sm:justify-end sm:px-2 sm:py-1.5">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="h-4 w-4 shrink-0 cursor-pointer rounded border-none accent-[var(--nc-primary)]"
            />
            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--nc-on-surface-variant)' }}>
              {t('adminFilterInStockOnly')}
            </span>
          </label>
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
          {filtered.length === 0 ? (
            <div
              className="col-span-12 flex flex-col items-center justify-center gap-3 rounded-2xl py-24 px-6 text-center"
              style={{
                backgroundColor: 'var(--nc-surface-low)',
                border: '1px solid rgba(67,70,84,0.08)',
              }}
            >
              <span className="material-symbols-outlined text-5xl" style={{ color: 'var(--nc-outline-variant)' }}>
                filter_alt_off
              </span>
              <p className="text-sm font-medium" style={{ color: 'var(--nc-on-surface-variant)' }}>
                {t('adminProductsEmptyFilter')}
              </p>
            </div>
          ) : (
            <>
          {/* Featured Large Card */}
          {featured && (
            <div className="col-span-12 lg:col-span-8 rounded-2xl overflow-hidden group relative"
              style={{
                backgroundColor: 'var(--nc-surface-low)',
                border: '1px solid rgba(67,70,84,0.05)',
              }}>
              <div className="flex h-full flex-col md:flex-row">
                <div
                  className="w-full md:w-1/2 relative flex min-h-[14rem] md:min-h-[18rem] items-center justify-center p-3 md:p-5"
                  style={{ backgroundColor: 'var(--nc-surface-highest)' }}
                >
                  {featured.image_url ? (
                    <img
                      src={featured.image_url}
                      alt={featured.name}
                      className="max-h-[min(26rem,52vh)] w-full object-contain object-center group-hover:scale-[1.02] transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full min-h-[12rem] flex items-center justify-center"
                      style={{ backgroundColor: 'var(--nc-surface-high)' }}>
                      <span className="material-symbols-outlined text-6xl" style={{ color: 'var(--nc-outline-variant)' }}>
                        image
                      </span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex gap-2 items-center"
                    style={{
                      backgroundColor: 'rgba(0,227,253,0.9)',
                      color: 'var(--nc-on-primary)',
                    }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>star</span>
                    Featured
                  </div>
                  {/* Gallery Indicator */}
                  {featured.gallery_urls && featured.gallery_urls.length > 0 && (
                    <div className="absolute bottom-4 left-4 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest flex gap-1 items-center"
                      style={{ backgroundColor: 'rgba(14,20,28,0.8)', color: 'var(--nc-on-surface)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>photo_library</span>
                      +{featured.gallery_urls.length} photos
                    </div>
                  )}
                </div>
                <div className="w-full md:w-1/2 p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full"
                        style={{ backgroundColor: 'rgba(180,197,255,0.1)', color: 'var(--nc-primary)' }}>
                        {featured.category} • {featured.type}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--nc-on-surface-variant)' }}>
                        ID: #{featured.id.slice(0, 8)}
                      </span>
                    </div>
                    <h3 className="font-headline text-3xl font-bold leading-tight mb-2 uppercase line-clamp-3">
                      {featured.name}
                    </h3>
                    <p className="text-sm line-clamp-3 opacity-70 mb-4" style={{ color: 'var(--nc-on-surface-variant)' }}>
                      {featured.description || 'Digital asset available for immediate delivery.'}
                    </p>
                    
                    <div className="flex gap-2 mb-2 flex-wrap items-center">
                       {featured.is_flash_sale && <span className="badge-flagged text-[9px] px-2 py-1 uppercase rounded-full font-bold inline-flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: '10px' }}>bolt</span>Flash Sale</span>}
                       {featured.is_bundle && <span className="badge-processing text-[9px] px-2 py-1 uppercase rounded-full font-bold inline-flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: '10px' }}>layers</span>Bundle</span>}
                    </div>
                    <div className="mb-4">
                      <AdminProductStockBadge p={featured} t={t} />
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between pt-6"
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
                        onClick={() => openEditor(featured)}
                        className="h-10 px-4 flex items-center justify-center rounded text-[11px] font-bold uppercase tracking-widest transition-colors gap-2"
                        style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-on-surface)' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                        Edit
                      </button>
                      <button
                        onClick={() => void remove(featured.id)}
                        className="h-10 w-10 flex items-center justify-center rounded transition-colors"
                        style={{ backgroundColor: 'var(--nc-surface-highest)' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--nc-error)' }}>delete</span>
                      </button>
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
                      <span className="text-sm font-black" style={{ color: 'var(--nc-secondary)' }}>{filtered.length}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--nc-surface-highest)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: filtered.length > 0 ? '100%' : '0%',
                          backgroundColor: 'var(--nc-secondary)',
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>In Stock</span>
                      <span className="text-sm font-black" style={{ color: 'var(--nc-tertiary)' }}>
                        {filtered.filter((r) => r.in_stock !== false).length}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--nc-surface-highest)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${filtered.length ? (filtered.filter((r) => r.in_stock !== false).length / filtered.length) * 100 : 0}%`,
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
                <p className="text-[10px] mb-3 leading-snug" style={{ color: 'var(--nc-on-surface-variant)' }}>
                  {t('adminCategoryDistributionHint')}
                </p>
                <div className="flex items-end justify-between gap-1 h-14">
                  {categoryDistribution.map(({ cat, count, barPct }) => {
                    const isPeak = maxCategoryCount > 0 && count === maxCategoryCount;
                    const hPx = Math.max(3, (barPct / 100) * 48);
                    return (
                      <div key={cat} className="flex-1 flex flex-col items-center gap-1 min-w-0 max-w-[16%]">
                        <div
                          className="w-full rounded-t-sm chart-bar"
                          title={`${cat}: ${count}`}
                          style={{
                            height: `${hPx}px`,
                            backgroundColor: isPeak ? 'var(--nc-primary)' : 'rgba(180,197,255,0.22)',
                            boxShadow: isPeak ? '0 0 12px rgba(98,138,255,0.35)' : undefined,
                          }}
                        />
                        <span
                          className="text-[8px] font-bold uppercase truncate w-full text-center"
                          style={{ color: 'var(--nc-on-surface-variant)' }}
                        >
                          {catLabelShort[cat]}
                        </span>
                        <span className="text-[9px] font-black tabular-nums" style={{ color: 'var(--nc-on-surface)' }}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Product Cards */}
          {rest.map((p) => (
            <div
              key={p.id}
              className="col-span-12 md:col-span-6 lg:col-span-3 rounded-xl overflow-hidden transition-all duration-300 relative group"
              style={{
                backgroundColor: 'var(--nc-surface-low)',
                border: '1px solid rgba(67,70,84,0.05)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(180,197,255,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(67,70,84,0.05)')}
            >
              <div
                className="min-h-[11rem] w-full relative flex items-center justify-center p-2"
                style={{ backgroundColor: 'rgba(0,0,0,0.22)' }}
              >
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="max-h-52 w-full object-contain object-center group-hover:scale-[1.02] transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full min-h-[10rem] flex items-center justify-center"
                    style={{ backgroundColor: 'var(--nc-surface-high)' }}>
                    <span className="material-symbols-outlined text-4xl" style={{ color: 'var(--nc-outline-variant)' }}>image</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 flex gap-1 items-center">
                   <div className="backdrop-blur px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest"
                     style={{ backgroundColor: 'rgba(14,20,28,0.8)', color: 'var(--nc-on-surface)' }}>
                     {p.category}
                   </div>
                   {p.gallery_urls && p.gallery_urls.length > 0 && (
                     <div className="backdrop-blur px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1"
                       style={{ backgroundColor: 'rgba(14,20,28,0.8)', color: 'var(--nc-on-surface)' }}>
                       <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>photo_library</span>
                       +{p.gallery_urls.length}
                     </div>
                   )}
                </div>
                {p.in_stock === false && (
                  <div className="absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--nc-error)' }} />
                )}
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h4 className="font-bold text-base line-clamp-2 leading-snug flex-1 min-w-0" title={p.name}>
                    {p.name}
                  </h4>
                  <AdminProductStockBadge p={p} t={t} />
                </div>
                <p className="text-xs opacity-60 mb-6 line-clamp-2" style={{ color: 'var(--nc-on-surface-variant)' }}>
                  {p.description || p.type}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black" style={{ color: 'var(--nc-primary)' }}>฿{Number(p.price).toFixed(2)}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditor(p)}
                      className="p-1.5 rounded transition-colors tooltip-hover"
                      title="Edit Product"
                      style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-on-surface-variant)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                    </button>
                    <button
                      onClick={() => void remove(p.id)}
                      className="p-1.5 rounded transition-colors tooltip-hover"
                      title="Delete Product"
                      style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-on-surface-variant)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--nc-error)' }}>delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
            </>
          )}
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
          <div className="overflow-x-auto min-w-0">
          <table className="nc-table w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(67,70,84,0.1)' }}>
                <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-left" style={{ color: 'var(--nc-on-surface-variant)' }}>{t('adminColName')}</th>
                <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-left" style={{ color: 'var(--nc-on-surface-variant)' }}>{t('adminColCategory')}</th>
                <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-left" style={{ color: 'var(--nc-on-surface-variant)' }}>{t('adminColPrice')}</th>
                <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-center" style={{ color: 'var(--nc-on-surface-variant)' }}>{t('adminColStock')}</th>
                <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-right" style={{ color: 'var(--nc-on-surface-variant)' }}>{t('adminActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>
                    {t('adminProductsEmptyFilter')}
                  </td>
                </tr>
              ) : (
              filtered.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-[rgba(180,197,255,0.02)]" style={{ borderBottom: '1px solid rgba(67,70,84,0.05)' }}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative"
                        style={{ backgroundColor: 'var(--nc-surface-highest)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-contain object-center p-0.5" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nc-outline-variant)' }}>image</span>
                          </div>
                        )}
                        {p.gallery_urls && p.gallery_urls.length > 0 && (
                          <div className="absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center" 
                               style={{ backgroundColor: 'var(--nc-primary)' }}>
                             <span className="material-symbols-outlined" style={{ fontSize: '8px', color: '#000' }}>collections</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <button onClick={() => openEditor(p)} className="font-bold text-sm hover:underline text-left line-clamp-2 leading-snug" style={{ color: 'var(--nc-on-surface)' }}>
                          {p.name}
                        </button>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--nc-on-surface-variant)' }}>ID: {p.id.slice(0,8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                     <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-primary)' }}>
                       {p.category}
                     </span>
                  </td>
                  <td className="py-4 px-6 tabular-nums font-bold" style={{ color: 'var(--nc-secondary)' }}>฿{Number(p.price).toFixed(2)}</td>
                  <td className="py-4 px-6 text-center align-middle">
                    <div className="flex justify-center">
                      <AdminProductStockBadge p={p} t={t} align="center" />
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => openEditor(p)}
                      className="text-xs font-bold uppercase tracking-wider transition-colors hover:underline"
                      style={{ color: 'var(--nc-primary)' }}
                    >
                      {t('adminEdit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(p.id)}
                      className="text-xs font-bold uppercase tracking-wider transition-colors hover:underline"
                      style={{ color: 'var(--nc-error)' }}
                    >
                      {t('adminDelete')}
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
          </div>
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

      {/* Slide-over Editor Panel */}
      {panelOpen && (
         <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEditor} />
            <div className="relative w-full max-w-2xl h-full flex flex-col shadow-2xl dropdown-panel"
                 style={{ backgroundColor: 'var(--nc-bg)', borderLeft: '1px solid rgba(67,70,84,0.2)' }}>
                 
                 {/* Panel Header */}
                 <div className="px-8 py-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(67,70,84,0.1)' }}>
                    <div>
                       <h3 className="font-headline text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--nc-on-surface)' }}>
                          {editingId ? 'Edit Product' : 'New Product'}
                       </h3>
                       <p className="text-[10px] uppercase font-bold tracking-widest mt-1" style={{ color: 'var(--nc-on-surface-variant)' }}>
                          {editingId ? `ID: ${editingId}` : 'Create a new digital asset'}
                       </p>
                    </div>
                    <button onClick={closeEditor} className="p-2 rounded-full transition-colors hover:bg-white/5" style={{ color: 'var(--nc-on-surface-variant)' }}>
                       <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
                    </button>
                 </div>

                 {/* Panel Body */}
                 <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
                    
                    {/* Basic Info */}
                    <div className="space-y-4">
                       <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--nc-primary)' }}>General Details</h4>
                       
                       <div className="space-y-3">
                          <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                            Product Name *
                            <input className="nc-input mt-1 w-full text-sm placeholder-opacity-50" 
                                   placeholder="e.g., 5000 VP Valorant Points"
                                   value={draft.name} 
                                   onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
                          </label>

                          <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                            Description
                            <textarea className="nc-input mt-1 w-full text-sm min-h-[100px] resize-y placeholder-opacity-50" 
                                      placeholder="Provide details about the product, delivery method, etc."
                                      value={draft.description} 
                                      onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
                          </label>

                          <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                            Base Price (THB) *
                            <input className="nc-input mt-1 w-full text-sm tabular-nums" type="number" step="0.01" min="0"
                                   value={draft.price} 
                                   onChange={e => setDraft(d => ({ ...d, price: parseFloat(e.target.value) }))} />
                          </label>
                       </div>
                    </div>

                    {/* Taxonomy & Categorization */}
                    <div className="space-y-4">
                       <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--nc-secondary)' }}>Categorization</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                            Category *
                            <select className="nc-input mt-1 w-full text-sm" 
                                    value={draft.category} 
                                    onChange={e => setDraft(d => ({ ...d, category: e.target.value as ProductCategory }))}>
                               <option value="mobile">Mobile Games</option>
                               <option value="pc">PC Games</option>
                               <option value="account">Game Accounts</option>
                               <option value="playstation">PlayStation</option>
                               <option value="xbox">Xbox</option>
                               <option value="switch">Nintendo Switch</option>
                            </select>
                          </label>

                          <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                            Product Type *
                            <select className="nc-input mt-1 w-full text-sm" 
                                    value={draft.type} 
                                    onChange={e => setDraft(d => ({ ...d, type: e.target.value as 'topup' | 'account' }))}>
                               <option value="topup">Top-up/Item</option>
                               <option value="account">Account/ID</option>
                            </select>
                          </label>
                       </div>
                    </div>

                    {/* Status Toggles */}
                    <div className="space-y-4">
                       <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--nc-tertiary)' }}>Status & Flags</h4>
                       <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                              style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.1)' }}>
                          <input type="checkbox" className="w-4 h-4 rounded accent-[var(--nc-primary)]"
                                 checked={draft.track_inventory === true}
                                 onChange={e => setDraft(d => ({
                                   ...d,
                                   track_inventory: e.target.checked,
                                   in_stock: e.target.checked ? (Number(d.stock_quantity) > 0) : d.in_stock,
                                 }))} />
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--nc-on-surface)' }}>{t('adminTrackInventory')}</span>
                       </label>
                       {draft.track_inventory === true && (
                          <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                            {t('adminStockQty')} *
                            <input className="nc-input mt-1 w-full text-sm tabular-nums" type="number" min={0} step={1}
                                   value={draft.stock_quantity ?? 0}
                                   onChange={e => setDraft(d => ({
                                     ...d,
                                     stock_quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                                     in_stock: Math.max(0, parseInt(e.target.value, 10) || 0) > 0,
                                   }))} />
                            <p className="mt-1 text-[10px] opacity-80">{t('adminStockFromQtyHint')}</p>
                          </label>
                       )}
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {!draft.track_inventory && (
                          <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                                 style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.1)' }}>
                             <input type="checkbox" className="w-4 h-4 rounded accent-[var(--nc-primary)]"
                                    checked={draft.in_stock}
                                    onChange={e => setDraft(d => ({ ...d, in_stock: e.target.checked }))} />
                             <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--nc-on-surface)' }}>In Stock</span>
                          </label>
                          )}
                          <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                                 style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.1)' }}>
                             <input type="checkbox" className="w-4 h-4 rounded accent-[var(--nc-secondary)]"
                                    checked={draft.is_flash_sale}
                                    onChange={e => setDraft(d => ({ ...d, is_flash_sale: e.target.checked }))} />
                             <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--nc-on-surface)' }}>Flash Sale</span>
                          </label>
                          <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                                 style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.1)' }}>
                             <input type="checkbox" className="w-4 h-4 rounded accent-[var(--nc-tertiary)]"
                                    checked={draft.is_bundle}
                                    onChange={e => setDraft(d => ({ ...d, is_bundle: e.target.checked }))} />
                             <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--nc-on-surface)' }}>Bundle</span>
                          </label>
                       </div>
                    </div>

                    {/* Media Uploads */}
                    <div className="space-y-4 pb-12">
                       <h4 className="text-xs font-bold uppercase tracking-widest flex items-center justify-between" style={{ color: 'var(--nc-on-surface)' }}>
                          <span>Media & Gallery</span>
                          <span className="text-[9px] opacity-60">JPEG, PNG, WebP up to 5MB</span>
                       </h4>
                       
                       {/* Main Image */}
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--nc-on-surface-variant)' }}>Main Thumbnail (1:1 Ratio Recommended)</label>
                          <div className="flex gap-4 items-end">
                             <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative group" 
                                  style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px dashed rgba(67,70,84,0.3)' }}>
                                {draft.image_url ? (
                                  <>
                                     <img src={draft.image_url} alt="Main" className="w-full h-full object-contain" />
                                     <button className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" 
                                             onClick={() => setDraft(d => ({ ...d, image_url: '' }))}>
                                        <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>delete</span>
                                     </button>
                                  </>
                                ) : (
                                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--nc-outline-variant)' }}>add_photo_alternate</span>
                                )}
                                {uploadingMain && (
                                   <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                      <span className="material-symbols-outlined animate-spin text-white">progress_activity</span>
                                   </div>
                                )}
                             </div>
                             
                             <div className="flex-1 space-y-2">
                                <input type="file" ref={mainImageInputRef} className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleMainImageUpload} />
                                <button className="nc-btn-ghost w-full py-2.5 text-xs flex justify-center items-center gap-2" 
                                        onClick={() => mainImageInputRef.current?.click()} disabled={uploadingMain}>
                                   <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload</span>
                                   {uploadingMain ? 'Uploading...' : 'Upload Local Image'}
                                </button>
                                <div className="text-[10px] text-center" style={{ color: 'var(--nc-on-surface-variant)' }}>Or provide a URL</div>
                                <input className="nc-input w-full text-xs" placeholder="https://..." value={draft.image_url} onChange={e => setDraft(d => ({ ...d, image_url: e.target.value }))} />
                             </div>
                          </div>
                       </div>

                       {/* Gallery Images */}
                       <div className="space-y-2 mt-6 pt-6" style={{ borderTop: '1px solid rgba(67,70,84,0.1)' }}>
                          <div className="flex items-center justify-between">
                             <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--nc-on-surface-variant)' }}>
                                Gallery Images ({(draft.gallery_urls || []).length})
                             </label>
                             
                             <input type="file" ref={galleryInputRef} className="hidden" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleGalleryUpload} />
                             <button className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                                     style={{ backgroundColor: 'rgba(180,197,255,0.1)', color: 'var(--nc-primary)' }}
                                     onClick={() => galleryInputRef.current?.click()}
                                     disabled={uploadingGallery}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{uploadingGallery ? 'progress_activity' : 'add'}</span>
                                {uploadingGallery ? 'Uploading...' : 'Add Photos'}
                             </button>
                          </div>
                          
                          {/* Gallery Grid */}
                          {(draft.gallery_urls && draft.gallery_urls.length > 0) ? (
                            <div className="grid grid-cols-4 gap-3 mt-3">
                               {draft.gallery_urls.map((url, idx) => (
                                 <div key={idx} className="aspect-square rounded-lg overflow-hidden relative group" style={{ backgroundColor: 'var(--nc-surface-highest)' }}>
                                    <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/60 text-white backdrop-blur">
                                       # {idx + 1}
                                    </div>
                                    <button className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" 
                                            onClick={() => removeGalleryImage(idx)}>
                                       <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>delete</span>
                                    </button>
                                 </div>
                               ))}
                            </div>
                          ) : (
                            <div className="w-full py-8 border border-dashed rounded-lg flex flex-col items-center justify-center mt-3" 
                                 style={{ borderColor: 'rgba(67,70,84,0.3)', backgroundColor: 'var(--nc-surface-low)' }}>
                               <span className="material-symbols-outlined mb-2 opacity-50" style={{ fontSize: '28px', color: 'var(--nc-on-surface-variant)' }}>collections</span>
                               <p className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>No gallery images added yet.</p>
                            </div>
                          )}
                          
                          {/* Manual Add Gallery URL Option */}
                          <div className="pt-2">
                             <details className="text-xs opacity-70 group">
                                <summary className="cursor-pointer select-none font-medium mb-2 outline-none">Advanced: Add by URL</summary>
                                <div className="flex gap-2">
                                   <input id="new-gallery-url" className="nc-input flex-1" placeholder="https://..." onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const el = e.currentTarget;
                                        if (el.value) {
                                          setDraft(d => ({ ...d, gallery_urls: [...(d.gallery_urls || []), el.value] }));
                                          el.value = '';
                                        }
                                      }
                                   }} />
                                   <button className="nc-btn-ghost px-4" onClick={() => {
                                      const el = document.getElementById('new-gallery-url') as HTMLInputElement;
                                      if (el && el.value) {
                                        setDraft(d => ({ ...d, gallery_urls: [...(d.gallery_urls || []), el.value] }));
                                        el.value = '';
                                      }
                                   }}>Add</button>
                                </div>
                             </details>
                          </div>
                       </div>
                    </div>

                 </div>

                 {/* Panel Footer */}
                 <div className="px-8 py-5 flex justify-end gap-3" style={{ backgroundColor: 'var(--nc-surface-low)', borderTop: '1px solid rgba(67,70,84,0.1)' }}>
                    <button onClick={closeEditor} className="nc-btn-ghost px-6" disabled={saving}>
                       Cancel
                    </button>
                    <button onClick={handleSave} className="nc-btn-primary px-8 flex items-center gap-2" disabled={saving}>
                       {saving ? (
                         <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span>
                       ) : (
                         <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                       )}
                       {saving ? 'Saving...' : 'Save Product'}
                    </button>
                 </div>
            </div>
         </div>
      )}

    </div>
  );
}
