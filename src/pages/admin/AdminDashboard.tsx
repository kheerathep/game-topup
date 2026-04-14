import { useEffect, useState } from 'react';
import { getAdminDashboardStats, type AdminDashboardStats } from '../../services/adminApi';
import { useLanguage } from '../../context/LanguageContext';

const CHART_DATA = [
  { day: 'MON', value: 40 },
  { day: 'TUE', value: 60 },
  { day: 'WED', value: 55 },
  { day: 'THU', value: 85 },
  { day: 'FRI', value: 100 },
  { day: 'SAT', value: 70 },
  { day: 'SUN', value: 45 },
];

const LOGS = [
  { label: 'New Order Received', sub: '2m ago • Auto-processed', color: 'var(--nc-secondary-dim)', glow: true },
  { label: 'Bulk Inventory Update', sub: '14m ago • Admin', color: 'var(--nc-tertiary)', glow: false },
  { label: 'High Volume Transaction', sub: '1h ago • Filter: Security', color: 'var(--nc-error)', glow: true },
  { label: 'System Cache Purge', sub: '3h ago • Automatic', color: 'var(--nc-primary)', glow: false },
];

export function AdminDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activeRange, setActiveRange] = useState<'7d' | '30d'>('7d');

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

  const metrics = stats
    ? [
        {
          icon: 'payments',
          label: t('adminStatRevenue'),
          value: `฿${stats.revenuePaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          change: '+12.4%',
          changeColor: 'var(--nc-secondary-dim)',
          iconBg: 'rgba(180,197,255,0.1)',
          iconColor: 'var(--nc-primary)',
        },
        {
          icon: 'group',
          label: t('adminStatOrders'),
          value: stats.orderCount.toLocaleString(),
          change: '+8.1%',
          changeColor: 'var(--nc-secondary-dim)',
          iconBg: 'rgba(216,185,255,0.1)',
          iconColor: 'var(--nc-tertiary)',
        },
        {
          icon: 'pending_actions',
          label: t('adminStatPending'),
          value: stats.pendingOrders.toString(),
          change: 'Urgent',
          changeColor: 'var(--nc-error)',
          iconBg: 'rgba(189,244,255,0.1)',
          iconColor: 'var(--nc-secondary)',
        },
        {
          icon: 'inventory',
          label: t('adminStatProducts'),
          value: stats.productCount.toString(),
          change: 'New',
          changeColor: 'var(--nc-primary)',
          iconBg: 'rgba(98,138,255,0.1)',
          iconColor: 'var(--nc-primary-container)',
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <section className="flex flex-col gap-2">
        <h2 className="text-4xl font-headline font-black tracking-tight uppercase"
          style={{ color: 'var(--nc-on-surface)' }}>
          Nexus Core <span style={{ color: 'var(--nc-primary)' }}>Live Status</span>
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

      {/* Metric Cards */}
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
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: m.changeColor }}
                >
                  {m.change}
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

      {/* Chart & Activity Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend Chart */}
        <div
          className="lg:col-span-2 rounded-xl p-8 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--nc-surface-low)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h3 className="text-xl font-headline font-bold" style={{ color: 'var(--nc-on-surface)' }}>
                Weekly Trend
              </h3>
              <p className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                Sales volume comparison across current week
              </p>
            </div>
            <div className="flex gap-2">
              <button
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

          {/* Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-4 px-4 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ borderBottom: '1px solid var(--nc-on-surface)' }} />
              ))}
            </div>
            {CHART_DATA.map((bar, i) => (
              <div key={bar.day} className="flex-1 flex flex-col items-center gap-2 group">
                <div
                  className="w-full rounded-t-sm transition-all chart-bar"
                  style={{
                    height: `${bar.value}%`,
                    backgroundColor:
                      bar.value === 100
                        ? 'var(--nc-primary-container)'
                        : 'var(--nc-surface-highest)',
                    boxShadow:
                      bar.value === 100
                        ? '0 0 20px rgba(98,138,255,0.4)'
                        : undefined,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
                <span
                  className="text-[10px] font-bold"
                  style={{
                    color: bar.value === 100 ? 'var(--nc-primary)' : 'var(--nc-on-surface-variant)',
                  }}
                >
                  {bar.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Logs / Activity */}
        <div
          className="rounded-xl p-8"
          style={{
            backgroundColor: 'var(--nc-surface-low)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <h3 className="text-xl font-headline font-bold mb-6" style={{ color: 'var(--nc-on-surface)' }}>
            Security Logs
          </h3>
          <div className="space-y-6">
            {LOGS.map((log) => (
              <div key={log.label} className="flex gap-4">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                  style={{
                    backgroundColor: log.color,
                    boxShadow: log.glow ? `0 0 8px ${log.color}` : undefined,
                  }}
                />
                <div>
                  <p className="text-sm font-medium">{log.label}</p>
                  <p
                    className="text-[10px] uppercase mt-1"
                    style={{ color: 'var(--nc-on-surface-variant)' }}
                  >
                    {log.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            className="w-full mt-8 py-3 rounded text-xs font-headline font-bold uppercase tracking-widest transition-colors"
            style={{
              backgroundColor: 'var(--nc-surface-bright)',
              color: 'var(--nc-on-surface)',
            }}
          >
            View All Logs
          </button>
        </div>
      </section>

      {/* Recent Transactions Table */}
      <section
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--nc-surface-low)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          className="p-8 flex justify-between items-center"
          style={{ borderBottom: '1px solid rgba(67,70,84,0.1)' }}
        >
          <h3 className="text-xl font-headline font-bold" style={{ color: 'var(--nc-on-surface)' }}>
            Recent Transactions
          </h3>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 text-xs font-bold transition-colors hover:text-[var(--nc-on-surface)]"
              style={{ color: 'var(--nc-on-surface-variant)' }}>
              <span className="material-symbols-outlined text-sm">filter_list</span> Filter
            </button>
            <button className="flex items-center gap-2 text-xs font-bold transition-colors hover:text-[var(--nc-on-surface)]"
              style={{ color: 'var(--nc-on-surface-variant)' }}>
              <span className="material-symbols-outlined text-sm">download</span> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
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
              {[
                { id: '#NX-90128', product: 'Void Catalyst Skin Pack', icon: 'videogame_asset', buyer: 'ZeroCool_88', status: 'delivered', amount: '฿240.00' },
                { id: '#NX-90129', product: '10,000 Nexus Credits', icon: 'token', buyer: 'Admin_Test', status: 'processing', amount: '฿99.99' },
                { id: '#NX-90130', product: 'Battle Pass Plus', icon: 'shield', buyer: 'Lara_K', status: 'delivered', amount: '฿45.50' },
                { id: '#NX-90131', product: 'Ultimate Boost Pack', icon: 'bolt', buyer: 'SpeedRunner', status: 'flagged', amount: '฿1,500.00' },
              ].map((tx) => (
                <tr key={tx.id}>
                  <td className="font-headline text-sm tracking-tight font-medium" style={{ color: 'var(--nc-primary)' }}>
                    {tx.id}
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center"
                        style={{ backgroundColor: 'var(--nc-surface-highest)' }}
                      >
                        <span className="material-symbols-outlined text-xs">{tx.icon}</span>
                      </div>
                      <span className="text-sm font-medium">{tx.product}</span>
                    </div>
                  </td>
                  <td className="text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>
                    {tx.buyer}
                  </td>
                  <td>
                    <span className={`badge-${tx.status} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider`}>
                      <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
                      {tx.status === 'delivered' ? 'Delivered' : tx.status === 'processing' ? 'Processing' : 'Flagged'}
                    </span>
                  </td>
                  <td className="text-sm font-bold text-right" style={{ color: 'var(--nc-on-surface)' }}>
                    {tx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="p-6 flex justify-center"
          style={{
            background: 'rgba(9,15,22,0.3)',
            borderTop: '1px solid rgba(67,70,84,0.1)',
          }}
        >
          <button
            className="text-[10px] font-black uppercase tracking-widest transition-colors hover:text-[var(--nc-primary)]"
            style={{ color: 'var(--nc-on-surface-variant)' }}
          >
            Load More Transactions
          </button>
        </div>
      </section>
    </div>
  );
}
