import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminOrderRow, OrderItem } from '../../types';
import { getOrderWithItemsAdmin, listOrdersAdmin, updateOrderStatus } from '../../services/adminApi';
import { getProductById } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/utils';
import { orderStatusFromAdminSelect } from '../../lib/orderStatus';

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
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

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

  const onStatusChange = async (id: string, raw: string) => {
    const newStatus = orderStatusFromAdminSelect(raw);
    // Optimistic update — อัพเดต UI ทันทีก่อนรอ server
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    setSavingStatusId(id);
    try {
      const { ok, error } = await updateOrderStatus(id, newStatus);
      if (ok) {
        void load();
        return;
      }
      // Rollback ถ้า server ตอบกลับว่า error
      void load();
      const msg = error?.message ?? '';
      window.alert(
        msg.toLowerCase().includes('insufficient stock') ? t('adminOrderMarkPaidStockError') : msg || 'Update failed',
      );
    } finally {
      setSavingStatusId(null);
    }
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
    const map: Record<string, { class: string }> = {
      pending: { class: 'badge-pending' },
      paid: { class: 'badge-paid' },
      cancelled: { class: 'badge-cancelled' },
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
      <div>
        <h2 className="font-headline text-4xl font-black tracking-tight" style={{ color: 'var(--nc-on-surface)' }}>
          Order Management
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--nc-on-surface-variant)' }}>
          {t('adminOrdersIntro')}
        </p>
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
            {paidCount} {t('adminOrdersPaidShort')}
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
        <div className="px-6 py-4 flex flex-wrap items-center justify-end gap-2"
          style={{ borderBottom: '1px solid rgba(67,70,84,0.1)' }}>
          <span className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
            {rows.length > 0
              ? `Showing ${page * 30 + 1}-${page * 30 + rows.length} of ${total} orders`
              : `0 of ${total} orders`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="nc-table">
            <thead>
              <tr>
                <th>{t('adminColOrder')}</th>
                <th>{t('adminColCustomer')}</th>
                <th>Asset Category</th>
                <th>{t('adminColSlip')}</th>
                <th>{t('adminColTotal')}</th>
                <th>{t('adminColStatus')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12" style={{ color: 'var(--nc-on-surface-variant)' }}>
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
                          {row.payment_method === 'qr'
                            ? t('paymentMethodQr')
                            : row.payment_method === 'bank_transfer'
                              ? t('paymentMethodBank')
                              : t('paymentMethodCard')}
                        </td>
                        <td className="align-middle">
                          {row.payment_method === 'bank_transfer' ? (
                            row.payment_slip_url ? (
                              <a
                                href={row.payment_slip_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-block rounded-md overflow-hidden border shrink-0 align-middle"
                                style={{ borderColor: 'rgba(255,255,255,0.12)', maxWidth: 48, maxHeight: 48 }}
                                title={t('adminSlipOpenFull')}
                              >
                                <img
                                  src={row.payment_slip_url}
                                  alt=""
                                  className="w-12 h-12 object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </a>
                            ) : (
                              <span className="text-[10px]" style={{ color: 'var(--nc-on-surface-variant)' }}>
                                {t('adminSlipMissing')}
                              </span>
                            )
                          ) : (
                            <span style={{ color: 'var(--nc-on-surface-variant)' }}>—</span>
                          )}
                        </td>
                        <td className="font-bold tabular-nums">
                          ฿{Number(row.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <select
                            value={row.status}
                            disabled={savingStatusId === row.id}
                            onChange={(e) => void onStatusChange(row.id, e.target.value)}
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border-none outline-none',
                              savingStatusId === row.id ? 'opacity-50 cursor-wait' : 'cursor-pointer',
                              badge.class,
                            )}
                          >
                            <option value="pending">{t('adminStatPending')}</option>
                            <option value="paid">{t('adminStatPaid')}</option>
                            <option value="cancelled">{t('adminStatCancelled')}</option>
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
                          <td colSpan={7} style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.5rem' }}>
                            {loadingDetail ? (
                              <span style={{ color: 'var(--nc-on-surface-variant)' }}>{t('loading')}</span>
                            ) : detail ? (
                              <OrderDetailBody
                                detail={detail}
                                paymentMethod={row.payment_method}
                                paymentSlipUrl={row.payment_slip_url}
                                t={t}
                              />
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
    </div>
  );
}

function OrderDetailBody({
  detail,
  paymentMethod,
  paymentSlipUrl,
  t,
}: {
  detail: DetailState;
  paymentMethod: string;
  paymentSlipUrl?: string | null;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-3">
      <p>
        <span style={{ color: 'var(--nc-on-surface-variant)' }}>{t('adminPaymentMethod')}: </span>
        <span className="font-bold" style={{ color: 'var(--nc-on-surface)' }}>
          {paymentMethod === 'qr'
            ? t('paymentMethodQr')
            : paymentMethod === 'bank_transfer'
              ? t('paymentMethodBank')
              : t('paymentMethodCard')}
        </span>
      </p>
      {paymentMethod === 'bank_transfer' && (
        <div className="space-y-2">
          <p>
            <span style={{ color: 'var(--nc-on-surface-variant)' }}>{t('adminPaymentSlip')}: </span>
            {paymentSlipUrl ? (
              <a
                href={paymentSlipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-sm break-all hover:underline"
                style={{ color: 'var(--nc-secondary)' }}
              >
                {t('successSlipLink')} ({t('adminSlipOpenFull')})
              </a>
            ) : (
              <span className="text-sm" style={{ color: 'var(--nc-on-surface-variant)' }}>
                {t('adminSlipMissing')}
              </span>
            )}
          </p>
          {paymentSlipUrl && (
            <div
              className="rounded-xl overflow-hidden border max-w-md"
              style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'var(--nc-surface-highest)' }}
            >
              <img
                src={paymentSlipUrl}
                alt={t('adminSlipPreviewAlt')}
                className="w-full max-h-[min(70vh,420px)] object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
        </div>
      )}
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
