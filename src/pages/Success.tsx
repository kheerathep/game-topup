import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getOrderById } from '../services/orders';
import type { Order } from '../types';
import { parseProductPrice } from '../utils/marketplaceFilters';
import { useLanguage } from '../context/LanguageContext';

export function Success() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void getOrderById(id).then(({ data, error }) => {
      if (error) setLoadError(error.message);
      setOrder(data);
    });
  }, [id]);

  const totalDisplay =
    order != null ? parseProductPrice(order.total_price).toLocaleString() : null;

  const copy = useMemo(() => {
    if (!order) return null;
    if (order.payment_method === 'bank_transfer') {
      return {
        badge: t('successBadgePending'),
        titleMain: t('successTitleBank'),
        titleGradient: '',
        description: t('successDescBank'),
        badgeStyle: 'pending' as const,
        icon: 'clock' as const,
      };
    }
    if (order.payment_method === 'qr') {
      return {
        badge: t('successBadgePaid'),
        titleMain: t('successTitlePromptPay'),
        titleGradient: '',
        description: t('successDescPromptPay'),
        badgeStyle: 'secondary' as const,
        icon: 'check' as const,
      };
    }
    return {
      badge: t('successBadgePaid'),
      titleMain: t('successTitleCard'),
      titleGradient: '',
      description: t('successDescCard'),
      badgeStyle: 'secondary' as const,
      icon: 'check' as const,
    };
  }, [order, t]);

  const loading = !order && !loadError;

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[70vh]">
      <Card className="w-full max-w-lg p-10 text-center flex flex-col items-center border border-[--color-ghost-border] relative overflow-hidden bg-[--color-surface]">
        <div className="absolute top-10 inset-x-0 h-32 bg-gradient-to-b from-[--color-primary]/20 to-transparent blur-3xl pointer-events-none" />

        {loading ? (
          <Loader2 className="w-16 h-16 text-[--color-primary] mb-6 relative z-10 animate-spin" />
        ) : !order && loadError ? (
          <AlertCircle className="w-24 h-24 text-[--color-error] mb-6 relative z-10" />
        ) : copy && copy.icon === 'clock' ? (
          <Clock className="w-24 h-24 text-amber-400/90 mb-6 relative z-10" />
        ) : (
          <CheckCircle2 className="w-24 h-24 text-[--color-secondary] mb-6 relative z-10" />
        )}

        <div
          className={`text-xs font-bold uppercase tracking-widest py-1 px-3 rounded-full mb-6 relative z-10 border ${
            copy && copy.badgeStyle === 'pending'
              ? 'bg-amber-400/15 text-amber-300 border-amber-400/35'
              : 'bg-[--color-secondary]/20 text-[--color-secondary] border-[--color-secondary]/30'
          }`}
        >
          {loading ? t('loading') : copy?.badge ?? '—'}
        </div>

        <h1 className="text-4xl font-bold text-white mb-2 relative z-10">
          {loading ? (
            <span className="text-on-surface-variant text-2xl">{t('loading')}</span>
          ) : copy ? (
            <>
              {copy.titleMain}
              {copy.titleGradient ? (
                <>
                  {' '}
                  <span className="text-gradient">{copy.titleGradient}</span>
                </>
              ) : null}
            </>
          ) : (
            <span className="text-on-surface-variant text-xl">Order</span>
          )}
        </h1>
        <p className="text-on-surface-variant text-sm mb-8 max-w-sm leading-relaxed relative z-10 min-h-[3rem]">
          {loading ? '…' : copy?.description}
          {!loading && loadError && !order && (
            <span className="block mt-2">{loadError}</span>
          )}
        </p>

        {loadError && order && (
          <p className="text-sm text-[--color-on-surface-variant] mb-4 relative z-10">
            {loadError} — แสดงรหัสอ้างอิงจาก URL
          </p>
        )}

        <div className="w-full bg-[--color-surface-container] p-4 rounded-xl border border-[--color-ghost-border] mb-4 flex justify-between items-center relative z-10">
          <span className="text-xs text-on-surface-variant uppercase font-bold tracking-widest">Order ID</span>
          <span className="font-mono text-white tracking-wider text-sm break-all text-right max-w-[60%]">
            {id || '—'}
          </span>
        </div>

        {order && totalDisplay != null && (
          <div className="w-full bg-[--color-surface-container] p-4 rounded-xl border border-[--color-ghost-border] mb-4 flex justify-between items-center relative z-10">
            <span className="text-xs text-on-surface-variant uppercase font-bold tracking-widest">Total</span>
            <span className="font-mono text-white">฿{totalDisplay}</span>
          </div>
        )}

        {order?.payment_slip_url && (
          <a
            href={order.payment_slip_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-8 w-full rounded-xl border border-[--color-primary]/40 bg-[--color-primary]/10 px-4 py-3 text-sm font-bold text-[--color-primary] hover:bg-[--color-primary]/20 relative z-10 text-center"
          >
            {t('successSlipLink')}
          </a>
        )}

        <Button
          onClick={() => navigate('/')}
          variant="primary"
          className="w-full justify-center relative z-10 flex items-center gap-2"
        >
          {t('successContinue')} <ChevronRight className="w-4 h-4" />
        </Button>
      </Card>
    </div>
  );
}
