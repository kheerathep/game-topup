import { useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ShoppingCart,
  Menu,
  Gamepad2,
  LogIn,
  UserCircle,
  Languages,
  Home,
  Zap,
  ShoppingBag,
  Fingerprint,
  Search,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../services/supabase';
import { cn } from '../../lib/utils';

function NavIconLink({
  to,
  icon: Icon,
  label,
  onNavigate,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      title={label}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        cn(
          'flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 min-h-[3.25rem] min-w-[3.25rem] sm:min-w-[4.25rem] transition-all duration-200',
          'border bg-[--color-surface-container-high]/90 backdrop-blur-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] focus-visible:ring-offset-2 focus-visible:ring-offset-[--color-background]',
          isActive
            ? 'border-[--color-primary]/60 text-[--color-primary] shadow-[0_0_16px_rgba(98,138,255,0.35)] bg-[--color-primary]/10'
            : 'border-white/10 text-[--color-on-surface-variant] hover:border-white/25 hover:text-white hover:bg-white/5',
        )
      }
    >
      <Icon className="w-6 h-6" strokeWidth={2} aria-hidden />
      <span className="hidden text-[10px] font-bold uppercase tracking-wider text-center leading-tight max-w-[4.5rem] truncate sm:block">
        {label}
      </span>
    </NavLink>
  );
}

function IconAction({
  children,
  className,
  ...props
}: React.ComponentProps<'button'> & { className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-200',
        'border-white/15 bg-[--color-surface-container-high]/95 text-white shadow-md',
        'hover:border-[--color-primary]/45 hover:bg-[--color-primary]/15 hover:text-[--color-secondary]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] focus-visible:ring-offset-2 focus-visible:ring-offset-[--color-background]',
        'active:scale-[0.96]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function IconLink({
  to,
  children,
  className,
  title,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <Link
      to={to}
      title={title}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-200',
        'border-white/15 bg-[--color-surface-container-high]/95 text-white shadow-md',
        'hover:border-[--color-primary]/45 hover:bg-[--color-primary]/15 hover:text-[--color-secondary]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] focus-visible:ring-offset-2 focus-visible:ring-offset-[--color-background]',
        'active:scale-[0.96]',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function MainLayout() {
  const { state: auth, dispatch: authDispatch } = useAuth();
  const { state: cart } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const cartItemCount = cart.items.reduce((n, i) => n + i.quantity, 0);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      authDispatch({ type: 'LOGOUT' });
    }
    setMobileOpen(false);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'th' : 'en');
  };

  const navItems = [
    { to: '/', icon: Home, label: t('home') },
    { to: '/marketplace', icon: Zap, label: t('gameTopupNav') },
    { to: '/buy-game-id', icon: Fingerprint, label: t('navBuyGameId') },
    { to: '/buy-games', icon: ShoppingBag, label: t('buyGames') },
  ] as const;

  const brandFull = t('brandName');
  const brandSpaceIdx = brandFull.indexOf(' ');
  const brandHead = brandSpaceIdx === -1 ? brandFull : brandFull.slice(0, brandSpaceIdx);
  const brandTail = brandSpaceIdx === -1 ? '' : brandFull.slice(brandSpaceIdx + 1);

  return (
    <div className="min-h-screen bg-[--color-background] text-on-background flex flex-col font-sans">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[--color-surface]/85 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 min-h-[4.25rem] py-2 flex items-center gap-3">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 -ml-1 hover:bg-white/5 transition-colors"
            title={t('brandName')}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--color-primary]/20 border border-[--color-primary]/35">
              <Gamepad2 className="w-6 h-6 text-[--color-primary]" strokeWidth={2} />
            </span>
            <span className="hidden text-lg font-black tracking-tight text-white sm:inline">
              {brandHead}
              {brandTail ? (
                <>
                  {' '}
                  <span className="text-[--color-primary]">{brandTail}</span>
                </>
              ) : null}
            </span>
          </Link>

          <nav
            className="hidden lg:flex flex-1 items-center justify-center gap-2 min-w-0"
            aria-label="Main"
          >
            {navItems.map(({ to, icon, label }) => (
              <NavIconLink key={to} to={to} icon={icon} label={label} />
            ))}
          </nav>

          <div className="hidden md:flex flex-1 lg:flex-none lg:max-w-xs xl:max-w-sm mx-2">
            <label className="relative flex w-full items-center group">
              <Search
                className="pointer-events-none absolute left-3.5 w-5 h-5 text-[--color-on-surface-variant] group-focus-within:text-[--color-primary] transition-colors"
                aria-hidden
              />
              <input
                type="search"
                placeholder={t('search')}
                className="w-full rounded-full border border-white/12 bg-[--color-surface-container-highest]/90 py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-[--color-outline-variant] shadow-inner focus:border-[--color-primary]/50 focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30"
              />
            </label>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-2.5 min-w-0">
            <IconAction
              onClick={toggleLanguage}
              title={`${t('language')}: ${language === 'en' ? 'English' : 'ไทย'} — คลิกสลับ`}
              aria-label={t('language')}
            >
              <Languages className="w-5 h-5 text-[--color-secondary]" strokeWidth={2} />
            </IconAction>

            <span className="relative">
              <IconLink to="/checkout" title={t('cart')} className="relative">
                <ShoppingCart className="w-5 h-5" strokeWidth={2} />
              </IconLink>
              {cartItemCount > 0 && (
                <span className="pointer-events-none absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[--color-error] px-1 text-[10px] font-black text-white shadow-lg ring-2 ring-[--color-surface]">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </span>

            {auth.user ? (
              <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/12 bg-[--color-surface-container-high]/80 p-1 pl-2 shadow-md">
                <div
                  className="flex max-w-[140px] items-center gap-2 lg:max-w-[180px]"
                  title={auth.user.email}
                >
                  <UserCircle className="h-9 w-9 shrink-0 text-[--color-primary]" strokeWidth={1.75} />
                  <span className="hidden lg:inline truncate text-sm font-semibold text-white">
                    {auth.user.email.split('@')[0]}
                  </span>
                </div>
                <IconAction
                  onClick={() => void handleLogout()}
                  title={t('logout')}
                  aria-label={t('logout')}
                  className="h-9 w-9 border-white/10"
                >
                  <LogOut className="w-5 h-5 text-[--color-error]" strokeWidth={2} />
                </IconAction>
              </div>
            ) : (
              <IconLink to="/login" title={t('login')} className="hidden sm:inline-flex border-[--color-primary]/40 bg-[--color-primary]/15 hover:bg-[--color-primary]/25">
                <LogIn className="w-5 h-5 text-[--color-on-primary-fixed]" strokeWidth={2} />
              </IconLink>
            )}

            <IconAction
              className="lg:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </IconAction>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[--color-surface]/95 px-3 py-4 backdrop-blur-xl">
            <nav className="flex flex-wrap justify-center gap-2" aria-label="Mobile main">
              {navItems.map(({ to, icon, label }) => (
                <NavIconLink
                  key={to}
                  to={to}
                  icon={icon}
                  label={label}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </nav>
            <div className="mt-4 md:hidden">
              <label className="relative flex w-full items-center">
                <Search className="pointer-events-none absolute left-3.5 w-5 h-5 text-[--color-on-surface-variant]" />
                <input
                  type="search"
                  placeholder={t('search')}
                  className="w-full rounded-full border border-white/12 bg-[--color-surface-container-highest] py-3 pl-11 pr-4 text-sm text-white placeholder:text-[--color-outline-variant] focus:border-[--color-primary]/50 focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30"
                />
              </label>
            </div>
            {auth.user ? (
              <div className="mt-4 flex items-center justify-center gap-3 sm:hidden">
                <div className="flex items-center gap-2 rounded-xl border border-white/12 px-3 py-2">
                  <UserCircle className="h-8 w-8 text-[--color-primary]" />
                  <span className="max-w-[200px] truncate text-sm font-medium text-white">
                    {auth.user.email.split('@')[0]}
                  </span>
                </div>
                <IconAction onClick={() => void handleLogout()} title={t('logout')} aria-label={t('logout')}>
                  <LogOut className="w-5 h-5 text-[--color-error]" />
                </IconAction>
              </div>
            ) : (
              <div className="mt-4 flex justify-center sm:hidden">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-[--color-primary]/50 bg-[--color-primary]/20 px-6 text-sm font-bold text-white hover:bg-[--color-primary]/30"
                >
                  <LogIn className="w-5 h-5" />
                  {t('login')}
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
      <main className="flex-1 w-full flex flex-col relative">
        <Outlet />
      </main>
      <footer className="bg-[--color-surface] border-t border-[--color-surface-container] py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-on-surface-variant text-sm flex flex-col items-center gap-4">
          <p>
            © 2026 {t('brandName')}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
