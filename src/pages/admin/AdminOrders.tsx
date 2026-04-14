import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminOrderRow, OrderItem } from '../../types';
import { getOrderWithItemsAdmin, listOrdersAdmin, updateOrderStatus } from '../../services/adminApi';
import { getProductById } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/utils';

type DetailState = {
  items: OrderItem[];
  names: Record<string, string>;
};

export function AdminOrders() {
  const { t } = useLanguage();
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailByOrder, setDetailByOrder] = useState<Record<string, DetailState | undefined>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { orders, total: t2 } = await listOrdersAdmin(page);
      setRows(orders);
      setTotal(t2);
      setDetailByOrder({});
      setExpanded(null);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const onStatusChange = async (id: string, status: AdminOrderRow['status']) => {
    const { ok } = await updateOrderStatus(id, status);
    if (ok) void load();
  };

  const toggleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (detailByOrder[id]) return;

    setDetailLoadingId(id);
    try {
      const { items } = await getOrderWithItemsAdmin(id);
      const names: Record<string, string> = {};
      await Promise.all(
        items.map(async (it) => {
          const p = await getProductById(it.product_id);
          if (p) names[it.id] = p.name;
        }),
      );
      setDetailByOrder((prev) => ({ ...prev, [id]: { items, names } }));
    } finally {
      setDetailLoadingId(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / 30));

  // Compute stats from loaded data
  const totalRevenue = rows.reduce((s, r) => s + Number(r.total_price), 0);
  const paidCount = rows.filter((r) => r.status === 'paid').length;
  const fulfillmentRate = rows.length ? ((paidCount / rows.length) * 100).toFixed(1) : '0';

  const getStatusBadge = (status: string) => {
    const map: Record<string, { class: string; label: string }> = {
      pending: { class: 'badge-pending', label: 'Pending' },
      paid: { class: 'badge-paid', label: 'Completed' },
      cancelled: { class: 'badge-cancelled', label: 'Cancelled' },
    };
    return map[status] ?? map.pending;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-headline text-4xl font-black tracking-tight"
            style={{ color: 'var(--nc-on-surface)' }}>
            Order Management
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--nc-on-surface-variant)' }}>
            {t('adminOrdersIntro')}
          </p>
        </div>
        <button className="nc-btn-ghost">
          <span className="material-symbols-outlined text-sm">download</span>
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--nc-surface-low)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--nc-on-surface-variant)' }}>
            Total Revenue
          </p>
          <p className="text-3xl font-headline font-black mt-2" style={{ color: 'var(--nc-on-surface)' }}>
            ฿{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--nc-secondary-dim)' }}>
            From {rows.length} orders
          </p>
        </div>
        <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--nc-surface-low)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--nc-on-surface-variant)' }}>
            Active Orders
          </p>
          <p className="text-3xl font-headline font-black mt-2" style={{ color: 'var(--nc-on-surface)' }}>
            {rows.filter((r) => r.status === 'pending').length}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--nc-on-surface-variant)' }}>
            {paidCount} completed
          </p>
        </div>
        <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--nc-surface-low)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--nc-on-surface-variant)' }}>
            Fulfillment Rate
          </p>
          <p className="text-3xl font-headline font-black mt-2" style={{ color: 'var(--nc-on-surface)' }}>
            {fulfillmentRate}%
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--nc-on-surface-variant)' }}>
            Average processing
          </p>
        </div>
      </section>

      {/* Orders Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
        {/* Filter Row */}
        <div className="p-6 flex flex-wrap items-center gap-4"
          style={{ borderBottom: '1px solid rgba(67,70,84,0.1)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase" style={{ color: 'var(--nc-on-surface-variant)' }}>Status:</span>
            <select className="nc-input py-1.5 text-xs w-auto"
              style={{ backgroundColor: 'var(--nc-surface-highest)', border: 'none', minWidth: '100px' }}>
              <option>All</option>
              <option>pending</option>
              <option>paid</option>
              <option>cancelled</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase" style={{ color: 'var(--nc-on-surface-variant)' }}>Date:</span>
            <span className="text-xs font-bold uppercase flex items-center gap-1" style={{ color: 'var(--nc-primary)' }}>
              Last 30 days
              <span className="material-symbols-outlined text-sm">calendar_month</span>
            </span>
          </div>
          <span className="ml-auto text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
            Showing 1-{rows.length} of {total} orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="nc-table">
            <thead>
              <tr>
                <th>{t('adminColOrder')}</th>
                <th>{t('adminColCustomer')}</th>
                <th>Asset Category</th>
                <th>{t('adminColTotal')}</th>
                <th>{t('adminColStatus')}</th>
                <th>Actions</th>
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
              ) : (
                rows.map((row) => {
                  const detail = detailByOrder[row.id];
                  const loadingDetail = detailLoadingId === row.id;
                  const badge = getStatusBadge(row.status);
                  return (
                    <Fragment key={row.id}>
                      <tr>
                        <td>
                          <div>
                            <span className="font-headline text-sm font-medium" style={{ color: 'var(--nc-primary)' }}>
                              #ORD-{row.id.slice(0, 4).toUpperCase()}
                            </span>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--nc-on-surface-variant)' }}>
                              {timeAgo(row.created_at)}
                            </p>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{
                                backgroundColor: 'var(--nc-surface-highest)',
                                color: 'var(--nc-primary)',
                              }}>
                              {(row.customer_display_name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{row.customer_display_name || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                          {row.payment_method === 'qr' ? 'QR Payment' : 'Credit Card'}
                        </td>
                        <td className="font-bold tabular-nums">
                          ฿{Number(row.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <select
                            value={row.status}
                            onChange={(e) => void onStatusChange(row.id, e.target.value as AdminOrderRow['status'])}
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border-none cursor-pointer outline-none',
                              badge.class,
                            )}
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => void toggleExpand(row.id)}
                            className="text-xs font-bold transition-colors hover:underline"
                            style={{ color: 'var(--nc-secondary)' }}
                          >
                            {expanded === row.id ? t('adminHide') : t('adminDetails')}
                          </button>
                        </td>
                      </tr>
                      {expanded === row.id && (
                        <tr>
                          <td colSpan={6} style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.5rem' }}>
                            {loadingDetail ? (
                              <span style={{ color: 'var(--nc-on-surface-variant)' }}>{t('loading')}</span>
                            ) : detail ? (
                              <OrderDetailBody detail={detail} paymentMethod={row.payment_method} t={t} />
                            ) : null}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>
        <span>
          {t('adminPageOf').replace('{p}', String(page + 1)).replace('{n}', String(pages))}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="nc-btn-ghost"
            style={{ opacity: page <= 0 ? 0.4 : 1 }}
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
            {t('adminPrev')}
          </button>
          <button
            type="button"
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="nc-btn-ghost"
            style={{ opacity: page >= pages - 1 ? 0.4 : 1 }}
          >
            {t('adminNext')}
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl p-6"
          style={{ backgroundColor: 'var(--nc-surface-low)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="font-headline font-bold text-lg mb-4">Order Detail Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Payment Method', value: '💳 Multiple', icon: 'credit_card' },
              { label: 'Shipping Type', value: '⚡ Instant Digital', icon: 'bolt' },
              { label: 'Avg. Order', value: `฿${rows.length ? (totalRevenue / rows.length).toFixed(0) : 0}`, icon: 'analytics' },
              { label: 'Pending', value: `${rows.filter((r) => r.status === 'pending').length} orders`, icon: 'schedule' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] uppercase font-bold tracking-wider mb-1"
                  style={{ color: 'var(--nc-on-surface-variant)' }}>{item.label}</p>
                <p className="text-sm font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl p-6"
          style={{ backgroundColor: 'var(--nc-surface-low)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="font-headline font-bold text-lg mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button className="nc-btn-ghost w-full justify-start">
              <span className="material-symbols-outlined text-sm">print</span>
              Print Invoice
            </button>
            <button className="nc-btn-ghost w-full justify-start">
              <span className="material-symbols-outlined text-sm">mail</span>
              Contact Customer
            </button>
            <button className="w-full flex items-center justify-start gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
              style={{ backgroundColor: 'rgba(147,0,10,0.15)', color: 'var(--nc-error)', border: '1px solid rgba(255,180,171,0.2)' }}>
              <span className="material-symbols-outlined text-sm">flag</span>
              Flag for Fraud
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function OrderDetailBody({
  detail,
  paymentMethod,
  t,
}: {
  detail: DetailState;
  paymentMethod: string;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-3">
      <p>
        <span style={{ color: 'var(--nc-on-surface-variant)' }}>{t('adminPaymentMethod')}: </span>
        <span className="font-bold" style={{ color: 'var(--nc-on-surface)' }}>{paymentMethod}</span>
      </p>
      <div className="space-y-2">
        {detail.items.map((it) => (
          <div
            key={it.id}
            className="flex items-center gap-4 p-3 rounded-lg"
            style={{ backgroundColor: 'var(--nc-surface-highest)' }}
          >
            <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nc-primary)' }}>
              inventory_2
            </span>
            <div className="flex-1">
              <Link to={`/product/${it.product_id}`} className="text-sm font-medium hover:underline"
                style={{ color: 'var(--nc-secondary)' }}>
                {detail.names[it.id] ?? it.product_id.slice(0, 8)}
              </Link>
              <p className="text-[10px]" style={{ color: 'var(--nc-on-surface-variant)' }}>
                × {it.quantity} @ ฿{Number(it.unit_price).toFixed(2)}
                {it.player_id ? ` — Player ID: ${it.player_id}` : ''}
              </p>
            </div>
            <span className="text-sm font-bold">
              ฿{(it.quantity * Number(it.unit_price)).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
