import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getOrderById } from '../services/orders';
import type { Order } from '../types';
import { parseProductPrice } from '../utils/marketplaceFilters';

export function Success() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
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

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[70vh]">
      <Card className="w-full max-w-lg p-10 text-center flex flex-col items-center border border-[--color-ghost-border] relative overflow-hidden bg-[--color-surface]">
        <div className="absolute top-10 inset-x-0 h-32 bg-gradient-to-b from-[--color-primary]/20 to-transparent blur-3xl pointer-events-none" />

        <CheckCircle2 className="w-24 h-24 text-[--color-secondary] mb-6 relative z-10" />

        <div className="bg-[--color-secondary]/20 text-[--color-secondary] text-xs font-bold uppercase tracking-widest py-1 px-3 rounded-full mb-6 relative z-10 border border-[--color-secondary]/30">
          Order Verified
        </div>

        <h1 className="text-4xl font-bold text-white mb-2 relative z-10">
          Payment <span className="text-gradient">Successful</span>
        </h1>
        <p className="text-on-surface-variant text-sm mb-8 max-w-sm leading-relaxed relative z-10">
          Your transaction has been securely processed. Items will be credited to your account shortly.
        </p>

        {loadError && (
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
          <div className="w-full bg-[--color-surface-container] p-4 rounded-xl border border-[--color-ghost-border] mb-8 flex justify-between items-center relative z-10">
            <span className="text-xs text-on-surface-variant uppercase font-bold tracking-widest">Total</span>
            <span className="font-mono text-white">฿{totalDisplay}</span>
          </div>
        )}

        <Button
          onClick={() => navigate('/')}
          variant="primary"
          className="w-full justify-center relative z-10 flex items-center gap-2"
        >
          Continue Shopping <ChevronRight className="w-4 h-4" />
        </Button>
      </Card>
    </div>
  );
}
