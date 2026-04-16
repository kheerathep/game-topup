import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminDashboardStats,
  getPaidRevenueChartBuckets,
  getRecentOrdersForDashboard,
  type AdminDashboardStats,
  type DashboardRecentTx,
  type RevenueDayBucket,
} from '../../services/adminApi';
import { useLanguage } from '../../context/LanguageContext';

export function AdminDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activeRange, setActiveRange] = useState<'7d' | '30d'>('7d');
  const [chartBuckets, setChartBuckets] = useState<RevenueDayBucket[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [recent, setRecent] = useState<DashboardRecentTx[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setErr(null);
      const s = await getAdminDashboardStats();
      if (!cancelled) {
        if (!s) setErr('failed');
        setStats(s);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setChartLoading(true);
    const days = activeRange === '7d' ? 7 : 30;
    void getPaidRevenueChartBuckets(days).then((b) => {
      if (!cancelled) {
        setChartBuckets(b);
        setChartLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeRange]);

  useEffect(() => {
    let cancelled = false;
    setRecentLoading(true);
    void getRecentOrdersForDashboard(8).then((r) => {
      if (!cancelled) {
        setRecent(r);
        setRecentLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const chartMax = useMemo(
    () => Math.max(...chartBuckets.map((b) => b.revenue), 0),
    [chartBuckets],
  );

  const metrics = stats
    ? [
        {
          icon: 'payments',
          label: t('adminStatRevenue'),
          value: `฿${stats.revenuePaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          detail: t('adminMetricPaidOrders').replace('{n}', String(stats.paidOrders)),
          iconBg: 'rgba(180,197,255,0.1)',
          iconColor: 'var(--nc-primary)',
        },
        {
          icon: 'group',
          label: t('adminStatOrders'),
          value: stats.orderCount.toLocaleString(),
          detail: t('adminMetricOrdersSub').replace('{n}', String(stats.cancelledOrders)),
          iconBg: 'rgba(216,185,255,0.1)',
          iconColor: 'var(--nc-tertiary)',
        },
        {
          icon: 'pending_actions',
          label: t('adminStatPending'),
          value: stats.pendingOrders.toString(),
          detail: stats.pendingOrders > 0 ? t('adminMetricNeedsAction') : t('adminMetricAllClear'),
          iconBg: 'rgba(189,244,255,0.1)',
          iconColor: 'var(--nc-secondary)',
        },
        {
          icon: 'inventory',
          label: t('adminStatProducts'),
          value: stats.productCount.toString(),
          detail: t('adminMetricCatalog'),
          iconBg: 'rgba(98,138,255,0.1)',
          iconColor: 'var(--nc-primary-container)',
        },
      ]
    : [];

  const statusBadge = (status: DashboardRecentTx['status']) => {
    if (status === 'paid') return { className: 'badge-paid', label: t('adminStatPaid') };
    if (status === 'pending') return { className: 'badge-pending', label: t('adminStatPending') };
    return { className: 'badge-cancelled', label: t('adminStatCancelled') };
  };

  return (
    <div className="space-y-8 sm:space-y-10 pb-4">
      <section className="flex flex-col gap-2">
        <h2
          className="text-4xl font-headline font-black tracking-tight"
          style={{ color: 'var(--nc-on-surface)' }}
        >
          {t('brandName')}{' '}
          <span style={{ color: 'var(--nc-primary)' }}>{t('adminDashboardLiveStatus')}</span>
        </h2>
        <p style={{ color: 'var(--nc-on-surface-variant)' }} className="max-w-2xl">
          {t('adminDashboardIntro')}
        </p>
      </section>

      {err === 'failed' && (
        <p className="text-sm" style={{ color: 'var(--nc-error)' }}>
          {t('adminLoadFailed')}
        </p>
      )}

      {stats && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="p-6 rounded-xl flex flex-col justify-between card-hover"
              style={{
                backgroundColor: 'var(--nc-surface-low)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex justify-between items-start">
                <span
                  className="material-symbols-outlined p-2 rounded-lg"
                  style={{ backgroundColor: m.iconBg, color: m.iconColor }}
                >
                  {m.icon}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider text-right max-w-[55%]"
                  style={{ color: 'var(--nc-on-surface-variant)' }}
                >
                  {m.detail}
                </span>
              </div>
              <div className="mt-8">
                <p className="text-3xl font-headline font-black" style={{ color: 'var(--nc-on-surface)' }}>
                  {m.value}
                </p>
                <p
                  className="text-[10px] uppercase font-bold tracking-widest mt-1"
                  style={{ color: 'var(--nc-on-surface-variant)' }}
                >
                  {m.label}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}

      <section>
        <div
          className="rounded-xl p-8 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--nc-surface-low)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex justify-between items-center mb-8 relative z-10 flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-headline font-bold" style={{ color: 'var(--nc-on-surface)' }}>
                Weekly Trend
              </h3>
              <p className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                {t('adminChartHint')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveRange('7d')}
                className="px-3 py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: activeRange === '7d' ? 'var(--nc-surface-highest)' : 'transparent',
                  color: activeRange === '7d' ? 'var(--nc-on-surface)' : 'var(--nc-on-surface-variant)',
                }}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setActiveRange('30d')}
                className="px-3 py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: activeRange === '30d' ? 'var(--nc-surface-highest)' : 'transparent',
                  color: activeRange === '30d' ? 'var(--nc-on-surface)' : 'var(--nc-on-surface-variant)',
                }}
              >
                30 Days
              </button>
            </div>
          </div>

          {chartLoading ? (
            <div className="h-64 flex items-center justify-center text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>
              {t('loading')}
            </div>
          ) : (
            <div
              className={`h-64 overflow-x-auto ${activeRange === '30d' ? 'pb-2' : ''}`}
            >
              <div
                className="h-full flex items-end justify-between gap-1 sm:gap-2 px-2 sm:px-4 relative"
                style={{ minWidth: activeRange === '30d' ? 'min(100%, 720px)' : undefined }}
              >
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ borderBottom: '1px solid var(--nc-on-surface)' }} />
                  ))}
                </div>
                {chartBuckets.map((bar, i) => {
                  const isPeak = chartMax > 0 && bar.revenue === chartMax;
                  const barPx = Math.max(4, (bar.barHeightPct / 100) * 200);
                  return (
                    <div
                      key={bar.dateKey}
                      className="flex-1 flex flex-col items-center justify-end gap-2 group min-w-[18px] max-w-[48px]"
                    >
                      <div
                        className="w-full rounded-t-sm transition-all chart-bar"
                        title={`${bar.dateKey}: ฿${bar.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        style={{
                          height: `${barPx}px`,
                          backgroundColor: isPeak ? 'var(--nc-primary-container)' : 'var(--nc-surface-highest)',
                          boxShadow: isPeak ? '0 0 20px rgba(98,138,255,0.4)' : undefined,
                          animationDelay: `${i * 40}ms`,
                        }}
                      />
                      <span
                        className="text-[9px] sm:text-[10px] font-bold whitespace-nowrap"
                        style={{
                          color: isPeak ? 'var(--nc-primary)' : 'var(--nc-on-surface-variant)',
                        }}
                      >
                        {bar.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--nc-surface-low)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          className="p-8 flex flex-wrap justify-between items-start gap-4"
          style={{ borderBottom: '1px solid rgba(67,70,84,0.1)' }}
        >
          <div>
            <h3 className="text-xl font-headline font-bold" style={{ color: 'var(--nc-on-surface)' }}>
              Recent Transactions
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--nc-on-surface-variant)' }}>
              {t('adminRecentTxHint')}
            </p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-90"
            style={{ color: 'var(--nc-primary)' }}
          >
            {t('adminNavOrders')} →
          </Link>
        </div>

        <div className="overflow-x-auto">
          {recentLoading ? (
            <div className="py-16 text-center text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>
              {t('loading')}
            </div>
          ) : recent.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>
              {t('adminNoOrdersYet')}
            </div>
          ) : (
            <table className="nc-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>{t('adminColName')}</th>
                  <th>Buyer</th>
                  <th>{t('adminColStatus')}</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((tx) => {
                  const sb = statusBadge(tx.status);
                  return (
                    <tr key={tx.orderId}>
                      <td
                        className="font-headline text-sm tracking-tight font-mono font-medium"
                        style={{ color: 'var(--nc-primary)' }}
                      >
                        #{tx.orderId.slice(0, 8).toUpperCase()}…
                      </td>
                      <td className="text-sm font-medium max-w-[200px] truncate" title={tx.productLabel}>
                        {tx.productLabel}
                      </td>
                      <td className="text-sm max-w-[140px] truncate" style={{ color: 'var(--nc-on-surface-variant)' }}>
                        {tx.buyer}
                      </td>
                      <td>
                        <span
                          className={`${sb.className} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {sb.label}
                        </span>
                      </td>
                      <td className="text-sm font-bold text-right" style={{ color: 'var(--nc-on-surface)' }}>
                        ฿{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
