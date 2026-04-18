import { NavLink, Outlet, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { useEffect, useRef, useState, useCallback } from 'react';
import { listOrdersAdmin, listAllProductsAdmin } from '../../services/adminApi';
import type { AdminOrderRow, Product } from '../../types';

/* ── Nav items ─────────────────────────────────────────────────── */
const nav = [
  { to: '/admin/dashboard',   key: 'adminNavDashboard',     icon: 'dashboard'    },
  { to: '/admin/orders',      key: 'adminNavOrders',        icon: 'shopping_cart' },
  { to: '/admin/support',     key: 'Live Chat',             icon: 'forum'        },
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
  const { t, language, setLanguage } = useLanguage();
  const { state: auth } = useAuth();

  const userName = auth.user?.email?.split('@')[0] ?? 'Admin';

  const [notifOpen, setNotifOpen]   = useState(false);
  const [notifs, setNotifs]         = useState<NotifItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [searchQ, setSearchQ]           = useState('');
  const [, setSearchResults] = useState<SearchResult[]>([]);
  const [, setSearchLoading] = useState(false);
  const [, setSearchOpen]     = useState(false);
  const searchRef  = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  useEffect(() => {
    if (notifOpen) void loadNotifs();
  }, [notifOpen, loadNotifs]);

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

        const navResults: SearchResult[] = nav
          .filter(({ key }) => (t(key) || key).toLowerCase().includes(q))
          .map(({ to, key, icon }) => ({
            id: to,
            label: t(key) || key,
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

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

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

  const pendingCount = notifs.length;

  return (
    <div className="admin-root relative min-h-screen selections:bg-[--nc-primary] selection:text-white">
      {/* Sidebar */}
      <aside
        className={cn(
          'h-screen w-[min(100vw,16rem)] fixed left-0 top-0 z-50 flex flex-col py-8 px-4',
          'border-r border-white/5 bg-[#0e141c]',
          'transition-transform duration-200 md:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="mb-10 px-4">
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-[#b4c5ff] font-headline">{t('brandName') || 'Game Marketplace'}</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold mt-1 text-gray-500">Admin Console</p>
        </div>

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
                    ? 'border-l-2 border-[#628aff] bg-[#b4c5ff]/10 text-[#b4c5ff]'
                    : 'border-l-2 border-transparent opacity-60 hover:opacity-100 hover:bg-white/5 text-gray-400',
                )
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
              <span className="font-headline uppercase tracking-wider text-sm font-bold">{t(key) || key}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-2 px-2">
          <Link to="/" className="w-full text-center py-3 block bg-[#b4c5ff] text-blue-950 font-bold rounded-md">
            Back to Store
          </Link>
        </div>
      </aside>

      <main className="relative z-10 min-h-screen md:ml-64 overflow-x-hidden">
        <header className="fixed top-0 left-0 right-0 md:left-64 z-30 h-16 px-6 flex items-center gap-4 bg-[#0e141c]/80 backdrop-blur-xl border-b border-white/5">
           <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="md:hidden p-2 text-gray-400"><span className="material-symbols-outlined">menu</span></button>
           <div className="flex-1 max-w-lg relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" style={{ fontSize: '18px' }}>search</span>
              <input 
                type="text" 
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search..." 
                className="w-full bg-white/5 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-[#b4c5ff]/50" 
              />
           </div>
           <div className="flex items-center gap-4 ml-auto">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
                title={`${t('language')}: ${language === 'en' ? 'English' : 'ไทย'}`}
                className="p-2 rounded-full transition-colors hover:bg-white/10"
                style={{ color: 'var(--nc-on-surface-variant)' }}
              >
                <span className="material-symbols-outlined block" style={{ fontSize: '20px' }}>translate</span>
              </button>

              <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-full overflow-hidden transition-colors hover:bg-white/10"
                  style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-on-surface-variant)' }}
                >
                  <span className="material-symbols-outlined block" style={{ fontSize: '20px' }}>notifications</span>
                  {pendingCount > 0 && (
                     <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--nc-primary-container)] pulse-neon" />
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-3 w-80 rounded-xl overflow-hidden dropdown-panel z-50 shadow-2xl bg-[#161c24] border border-white/10 p-2">
                     <p className="text-sm font-bold p-3 text-white">Notifications</p>
                     {notifLoading ? (
                        <p className="text-xs text-center py-6 text-gray-500">Loading...</p>
                     ) : notifs.length > 0 ? (
                        <div className="space-y-1">
                          {notifs.map(n => (
                            <Link key={n.id} to={n.href} className="flex gap-3 p-3 rounded-lg hover:bg-[#2f353e] transition-colors items-start">
                              <span className="material-symbols-outlined shrink-0" style={{ color: n.color }}>{n.icon}</span>
                              <div>
                                <p className="text-xs font-bold text-white mb-0.5">{n.label}</p>
                                <p className="text-[10px] text-gray-400">{n.sub}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                     ) : (
                        <p className="text-xs text-center py-6 text-gray-500">No new notifications</p>
                     )}
                  </div>
                )}
              </div>
              <div className="h-6 w-px bg-white/10 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center font-bold text-xs">{userName[0]?.toUpperCase()}</div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-white leading-none">{userName}</p>
                  <p className="text-[9px] uppercase text-gray-500">Admin</p>
                </div>
              </div>
           </div>
        </header>

        <div className="pt-20 pb-10 px-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
