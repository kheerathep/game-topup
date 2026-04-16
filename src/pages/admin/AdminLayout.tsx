import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { useEffect, useRef, useState, useCallback } from 'react';
import { listOrdersAdmin, listAllProductsAdmin } from '../../services/adminApi';
import { supabase } from '../../services/supabase';
import type { AdminOrderRow, Product } from '../../types';

/* ── Nav items ─────────────────────────────────────────────────── */
const nav = [
  { to: '/admin/dashboard',   key: 'adminNavDashboard',     icon: 'dashboard'    },
  { to: '/admin/orders',      key: 'adminNavOrders',        icon: 'shopping_cart' },
  { to: '/admin/products',    key: 'adminNavProducts',      icon: 'inventory_2'  },
  { to: '/admin/categories',  key: 'adminNavCategories',    icon: 'category'     },
  { to: '/admin/banners',     key: 'adminNavBanners',       icon: 'ad_units'     },
  { to: '/admin/settings',    key: 'adminNavSettings',      icon: 'settings'     },
] as const;

/* ── Types ──────────────────────────────────────────────────────── */
type NotifItem = {
  id: string;
  label: string;
  sub: string;
  icon: string;
  color: string;
  href: string;
};

type SearchResult = {
  id: string;
  label: string;
  sub: string;
  icon: string;
  href: string;
};

/* ── Admin Layout ────────────────────────────────────────────────── */
export function AdminLayout() {
  const { t } = useLanguage();
  const { state: auth, dispatch: authDispatch } = useAuth();
  const navigate = useNavigate();

  const userName = auth.user?.email?.split('@')[0] ?? 'Admin';

  /* ── Notifications state ─────────────── */
  const [notifOpen, setNotifOpen]   = useState(false);
  const [notifs, setNotifs]         = useState<NotifItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  /* ── Search state ────────────────────── */
  const [searchQ, setSearchQ]           = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const searchRef  = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── User menu state ─────────────────── */
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  /* ── Load notifications (pending orders) ─ */
  const loadNotifs = useCallback(async () => {
    setNotifLoading(true);
    try {
      const { orders } = await listOrdersAdmin(0);
      const pending = orders.filter((o) => o.status === 'pending').slice(0, 8);
      const items: NotifItem[] = pending.map((o: AdminOrderRow) => ({
        id: o.id,
        label: `New Order #${o.id.slice(0, 6).toUpperCase()}`,
        sub: `฿${Number(o.total_price).toLocaleString()} — ${o.customer_display_name || 'Guest'}`,
        icon: 'shopping_cart',
        color: 'var(--nc-secondary-dim)',
        href: '/admin/orders',
      }));
      setNotifs(items);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  /* ── Open notif panel → refresh ─────── */
  useEffect(() => {
    if (notifOpen) void loadNotifs();
  }, [notifOpen, loadNotifs]);

  /* ── Search across orders + products ─── */
  useEffect(() => {
    const q = searchQ.trim().toLowerCase();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [products] = await Promise.all([
          listAllProductsAdmin(),
        ]);
        const prodResults: SearchResult[] = (products as Product[])
          .filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
          .slice(0, 5)
          .map((p) => ({
            id: p.id,
            label: p.name,
            sub: `Product — ฿${Number(p.price).toFixed(2)} · ${p.category}`,
            icon: 'inventory_2',
            href: '/admin/products',
          }));

        // Quick section nav matches
        const navResults: SearchResult[] = nav
          .filter(({ key }) => t(key).toLowerCase().includes(q))
          .map(({ to, key, icon }) => ({
            id: to,
            label: t(key),
            sub: 'Admin section',
            icon,
            href: to,
          }));

        setSearchResults([...navResults, ...prodResults]);
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQ, t]);

  /* ── Click-outside to close panels ──── */
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  /* ── Keyboard shortcut: Cmd/Ctrl+K ──── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
        setUserMenuOpen(false);
        setMobileSidebarOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* ── Logout ──────────────────────────── */
  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    else authDispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

  /* ── Search result click ─────────────── */
  const onSelectResult = (href: string) => {
    setSearchQ('');
    setSearchOpen(false);
    navigate(href);
  };

  const pendingCount = notifs.length;

  return (
    <div className="admin-root relative min-h-screen">
      {/* Neon Glow Overlays — fixed; keep out of flex layout */}
      <div className="neon-glow-1 pointer-events-none" aria-hidden />
      <div className="neon-glow-2 pointer-events-none" aria-hidden />

      {mobileSidebarOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className={cn(
          'h-screen w-[min(100vw,16rem)] max-w-[85vw] fixed left-0 top-0 z-50 flex flex-col py-6 sm:py-8 px-3 sm:px-4',
          'border-r border-[rgba(67,70,84,0.15)] bg-[var(--nc-bg)]',
          'transition-transform duration-200 ease-out md:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Brand */}
        <div className="mb-10 px-4">
          <h1
            className="text-2xl font-black tracking-tighter font-headline"
            style={{ color: 'var(--nc-primary)' }}
          >
            {t('brandName')}
          </h1>
          <p
            className="text-[10px] uppercase tracking-[0.2em] font-bold mt-1"
            style={{ color: 'rgba(195,198,214,0.5)' }}
          >
            {t('adminConsoleSubtitle')}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5">
          {nav.map(({ to, key, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'border-l-2 border-[#628aff]'
                    : 'border-l-2 border-transparent opacity-60 hover:opacity-100 hover:bg-white/5',
                )
              }
              style={({ isActive }) => ({
                background: isActive
                  ? 'linear-gradient(90deg, rgba(98,138,255,0.15), transparent)'
                  : undefined,
                color: isActive ? 'var(--nc-primary)' : 'var(--nc-on-surface-variant)',
              })}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {icon}
              </span>
              <span className="font-headline uppercase tracking-wider text-sm font-bold">
                {t(key)}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="mt-auto space-y-2 px-2">
          <Link
            to="/"
            onClick={() => setMobileSidebarOpen(false)}
            className="nc-btn-primary w-full text-center py-3 block"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>
              store
            </span>
            {t('adminBackStore')}
          </Link>
        </div>
      </aside>

      {/* ── Main shell ──────────────────────────────── */}
      <main className="relative z-10 min-h-screen w-full min-w-0 md:ml-64">

        {/* Top App Bar */}
        <header
          className="fixed top-0 left-0 right-0 md:left-64 z-30 h-16 px-4 sm:px-6 md:px-10 lg:px-12 flex items-center gap-3 sm:gap-4 backdrop-blur-xl border-b border-[rgba(67,70,84,0.12)] bg-[rgba(14,20,28,0.85)]"
        >
          <button
            type="button"
            className="md:hidden shrink-0 flex h-10 w-10 items-center justify-center rounded-lg text-[var(--nc-on-surface-variant)] hover:bg-white/5"
            aria-label="Open menu"
            aria-expanded={mobileSidebarOpen}
            onClick={() => setMobileSidebarOpen((o) => !o)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
              {mobileSidebarOpen ? 'close' : 'menu'}
            </span>
          </button>
          {/* ── Search ── */}
          <div ref={searchRef} className="relative flex-1 max-w-lg min-w-0">
            <div className="relative flex items-center">
              {/* Search icon — fixed size via style, not text-sm */}
              <span
                className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 select-none"
                style={{ fontSize: '18px', color: 'var(--nc-on-surface-variant)', lineHeight: 1 }}
                aria-hidden
              >
                search
              </span>
              <input
                ref={searchInputRef}
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onFocus={() => searchQ.trim().length >= 2 && setSearchOpen(true)}
                placeholder="Search products, orders, sections… (⌘K)"
                className="nc-input nc-input--leading-icon w-full rounded-lg"
                style={{
                  backgroundColor: 'var(--nc-surface-highest)',
                  border: 'none',
                  height: '38px',
                }}
              />
              {searchLoading && (
                <span
                  className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
                  style={{ fontSize: '16px', color: 'var(--nc-on-surface-variant)' }}
                >
                  progress_activity
                </span>
              )}
            </div>

            {/* Search dropdown */}
            {searchOpen && searchResults.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-2xl z-50"
                style={{
                  backgroundColor: 'var(--nc-surface-container)',
                  border: '1px solid rgba(67,70,84,0.3)',
                }}
              >
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectResult(r.href)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{ borderBottom: '1px solid rgba(67,70,84,0.08)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(180,197,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                  >
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--nc-surface-highest)' }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '16px', color: 'var(--nc-primary)' }}
                      >
                        {r.icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--nc-on-surface)' }}>
                        {r.label}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--nc-on-surface-variant)' }}>
                        {r.sub}
                      </p>
                    </div>
                    <span
                      className="material-symbols-outlined shrink-0 ml-auto opacity-40"
                      style={{ fontSize: '14px' }}
                    >
                      arrow_forward
                    </span>
                  </button>
                ))}
                <div className="px-4 py-2 text-[9px] uppercase tracking-widest font-bold"
                  style={{ color: 'rgba(195,198,214,0.4)' }}>
                  {searchResults.length} results — press Esc to close
                </div>
              </div>
            )}
            {searchOpen && searchQ.trim().length >= 2 && searchResults.length === 0 && !searchLoading && (
              <div
                className="absolute top-full left-0 right-0 mt-2 rounded-xl px-4 py-6 text-center shadow-2xl z-50"
                style={{
                  backgroundColor: 'var(--nc-surface-container)',
                  border: '1px solid rgba(67,70,84,0.3)',
                }}
              >
                <span
                  className="material-symbols-outlined text-3xl block mb-2"
                  style={{ color: 'var(--nc-outline-variant)' }}
                >
                  search_off
                </span>
                <p className="text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>
                  No results for "{searchQ}"
                </p>
              </div>
            )}
          </div>

          {/* ── Right: Notifications + User ── */}
          <div className="flex items-center gap-3 ml-auto">

            {/* Notification Bell */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-all"
                style={{
                  backgroundColor: notifOpen ? 'rgba(180,197,255,0.1)' : 'transparent',
                  color: notifOpen ? 'var(--nc-secondary)' : 'var(--nc-on-surface-variant)',
                }}
                onMouseEnter={(e) => !notifOpen && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => !notifOpen && (e.currentTarget.style.backgroundColor = 'transparent')}
                aria-label="Notifications"
                aria-expanded={notifOpen}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                  notifications
                </span>
                {pendingCount > 0 && (
                  <span
                    className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[8px] font-black"
                    style={{
                      backgroundColor: 'var(--nc-secondary-dim)',
                      color: '#000',
                      padding: '0 3px',
                    }}
                  >
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notifOpen && (
                <div
                  className="absolute top-full right-0 mt-2 w-80 rounded-xl overflow-hidden shadow-2xl z-50"
                  style={{
                    backgroundColor: 'var(--nc-surface-container)',
                    border: '1px solid rgba(67,70,84,0.3)',
                  }}
                >
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{ borderBottom: '1px solid rgba(67,70,84,0.12)' }}
                  >
                    <p className="text-sm font-headline font-bold" style={{ color: 'var(--nc-on-surface)' }}>
                      Notifications
                    </p>
                    {pendingCount > 0 && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'rgba(0,218,243,0.1)',
                          color: 'var(--nc-secondary-dim)',
                        }}
                      >
                        {pendingCount} pending
                      </span>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {notifLoading ? (
                      <div className="py-8 text-center">
                        <span
                          className="material-symbols-outlined animate-spin block mb-2"
                          style={{ color: 'var(--nc-on-surface-variant)', fontSize: '24px' }}
                        >
                          progress_activity
                        </span>
                        <p className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                          Loading…
                        </p>
                      </div>
                    ) : notifs.length === 0 ? (
                      <div className="py-8 text-center">
                        <span
                          className="material-symbols-outlined block mb-2"
                          style={{ color: 'var(--nc-outline-variant)', fontSize: '28px' }}
                        >
                          notifications_none
                        </span>
                        <p className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                          All caught up!
                        </p>
                      </div>
                    ) : (
                      notifs.map((n) => (
                        <Link
                          key={n.id}
                          to={n.href}
                          onClick={() => setNotifOpen(false)}
                          className="flex items-start gap-3 px-4 py-3 transition-colors"
                          style={{ borderBottom: '1px solid rgba(67,70,84,0.06)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(180,197,255,0.04)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: 'rgba(0,218,243,0.1)' }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '15px', color: n.color }}
                            >
                              {n.icon}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: 'var(--nc-on-surface)' }}
                            >
                              {n.label}
                            </p>
                            <p
                              className="text-[10px] truncate mt-0.5"
                              style={{ color: 'var(--nc-on-surface-variant)' }}
                            >
                              {n.sub}
                            </p>
                          </div>
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0 mt-2 pulse-neon"
                            style={{ backgroundColor: n.color }}
                          />
                        </Link>
                      ))
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(67,70,84,0.12)' }}>
                    <Link
                      to="/admin/orders"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-center justify-center gap-1 px-4 py-3 w-full text-xs font-bold uppercase tracking-wider transition-colors"
                      style={{ color: 'var(--nc-primary)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(180,197,255,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                    >
                      View all orders
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-6 w-px" style={{ backgroundColor: 'rgba(67,70,84,0.3)' }} />

            {/* User Profile Menu */}
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all"
                style={{
                  backgroundColor: userMenuOpen ? 'rgba(180,197,255,0.08)' : 'transparent',
                }}
                onMouseEnter={(e) => !userMenuOpen && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => !userMenuOpen && (e.currentTarget.style.backgroundColor = 'transparent')}
                aria-expanded={userMenuOpen}
                aria-label="User menu"
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, var(--nc-primary-container), var(--nc-tertiary-container))',
                    color: 'white',
                  }}
                >
                  {userName[0]?.toUpperCase()}
                </div>
                {/* Name */}
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium leading-tight" style={{ color: 'var(--nc-on-surface)' }}>
                    {userName}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider leading-tight" style={{ color: 'var(--nc-on-surface-variant)' }}>
                    System Admin
                  </p>
                </div>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '14px', color: 'var(--nc-on-surface-variant)' }}
                >
                  expand_more
                </span>
              </button>

              {/* User dropdown */}
              {userMenuOpen && (
                <div
                  className="absolute top-full right-0 mt-2 w-52 rounded-xl overflow-hidden shadow-2xl z-50"
                  style={{
                    backgroundColor: 'var(--nc-surface-container)',
                    border: '1px solid rgba(67,70,84,0.3)',
                  }}
                >
                  {/* User info header */}
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: '1px solid rgba(67,70,84,0.12)' }}
                  >
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--nc-on-surface)' }}>
                      {auth.user?.email}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--nc-on-surface-variant)' }}>
                      System Admin
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <Link
                      to="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors w-full"
                      style={{ color: 'var(--nc-on-surface-variant)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>store</span>
                      {t('adminBackStore')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors w-full"
                      style={{ color: 'var(--nc-error)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,180,171,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>logout</span>
                      {t('logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="pt-20 sm:pt-24 pb-10 sm:pb-16 px-4 sm:px-6 md:px-10 lg:px-12 max-w-7xl mx-auto w-full min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
