import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { getProductsByIds } from '../services/api';
import { createOrder } from '../services/orders';
import type { OrderItem, Product } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CreditCard, QrCode, ShieldCheck } from 'lucide-react';
import { isCheckoutLineSelected } from '../context/CartContext';

function stripCheckoutMeta(items: OrderItem[]): OrderItem[] {
  return items.map(({ checkout_selected: _c, ...rest }) => rest);
}

type CheckoutPaymentLocationState = {
  checkoutLineIds?: string[];
};

export function CheckoutPayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { state: cart, dispatch: cartDispatch } = useCart();
  const { state: auth } = useAuth();

  const [method, setMethod] = useState<'qr' | 'credit_card'>('credit_card');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const idsFromCartNav = (location.state as CheckoutPaymentLocationState | null)?.checkoutLineIds;

  const selectedItems = useMemo(() => {
    if (idsFromCartNav != null && idsFromCartNav.length > 0) {
      const allow = new Set(idsFromCartNav);
      return cart.items.filter((i) => allow.has(i.id));
    }
    return cart.items.filter(isCheckoutLineSelected);
  }, [cart.items, idsFromCartNav]);

  useEffect(() => {
    const ids = [...new Set(selectedItems.map((i) => i.product_id))];
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    setProductsError('');
    void getProductsByIds(ids)
      .then(setProducts)
      .catch((e) => setProductsError(e instanceof Error ? e.message : 'Could not load catalog'));
  }, [selectedItems]);

  const total = useMemo(
    () => selectedItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0),
    [selectedItems],
  );

  if (cart.items.length === 0) {
    return <Navigate to="/checkout" replace />;
  }

  if (selectedItems.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-on-surface-variant">{t('cartPickOne')}</p>
        <Button type="button" onClick={() => navigate('/checkout')}>
          {t('paymentBackToCart')}
        </Button>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (!auth.user) {
      navigate('/login', { state: { from: '/checkout/payment' } });
      return;
    }
    setCheckoutError('');
    setCheckoutBusy(true);
    try {
      const forDb = stripCheckoutMeta(selectedItems);
      const lineIds = selectedItems.map((i) => i.id);
      const { orderId, error } = await createOrder(auth.user.id, forDb, total, method);
      if (error) {
        setCheckoutError(error.message);
        return;
      }
      cartDispatch({ type: 'REMOVE_LINES', payload: lineIds });
      navigate(`/order/${orderId}`);
    } finally {
      setCheckoutBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full flex flex-col lg:flex-row gap-8">
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-white">{t('paymentPageTitle')}</h1>
          <Link
            to="/checkout"
            className="text-sm font-bold uppercase tracking-widest text-[--color-primary] hover:underline"
          >
            {t('paymentBackToCart')}
          </Link>
        </div>

        {productsError && (
          <p className="text-sm text-[--color-error] max-w-2xl">{productsError}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          {[
            { id: 'credit_card' as const, label: t('paymentMethodCard'), icon: CreditCard },
            { id: 'qr' as const, label: t('paymentMethodQr'), icon: QrCode },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMethod(opt.id)}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                method === opt.id
                  ? 'bg-[--color-primary]/10 border-[--color-primary] text-[--color-primary]'
                  : 'bg-[--color-surface-container] border-transparent text-on-surface hover:bg-[--color-surface-variant]'
              }`}
            >
              <opt.icon className="w-6 h-6" />
              <span className="font-bold">{opt.label}</span>
            </button>
          ))}
        </div>

        <Card className="mt-2 border border-[--color-ghost-border] bg-[--color-surface-container]">
          {method === 'credit_card' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CreditCard /> {t('paymentGatewayHeading')}
              </h3>
              <Input label={t('paymentCardNumber')} placeholder="0000 0000 0000 0000" />
              <div className="flex gap-4">
                <Input label={t('paymentCardExpiry')} placeholder="12/26" />
                <Input label={t('paymentCardCvc')} placeholder="123" />
              </div>
              <Input label={t('paymentCardName')} placeholder="John Doe" />
            </div>
          )}

          {method === 'qr' && (
            <div className="space-y-6 flex flex-col items-center justify-center py-8">
              <div className="bg-white p-4 rounded-xl">
                <QrCode className="w-32 h-32 text-black" />
              </div>
              <p className="text-sm font-medium text-on-surface-variant text-center max-w-sm">
                {t('paymentQrHint')}
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="w-full lg:w-[400px]">
        <Card className="sticky top-28 bg-[--color-surface] border border-[--color-ghost-border]">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-[--color-ghost-border] pb-4">
            {t('paymentOrderSummary')}
          </h2>

          <div className="mb-6 max-h-[40vh] space-y-3 overflow-y-auto pr-1">
            {selectedItems.map((item) => {
              const pkg = products.find((p) => p.id === item.product_id);
              const lineTotal = item.unit_price * item.quantity;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-[--color-ghost-border] bg-[--color-surface-container]/80 px-3 py-3"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black">
                    {pkg ? (
                      <img src={pkg.image_url} alt="" className="h-full w-full object-cover opacity-90" />
                    ) : (
                      <div className="h-full w-full bg-[--color-surface-container-high]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-on-surface">
                      {pkg?.name ?? `Product ${item.product_id.slice(0, 8)}…`}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      ×{item.quantity} · ฿{lineTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[--color-ghost-border] space-y-4">
            <div className="flex justify-between items-end pt-2">
              <span className="text-lg font-bold">{t('paymentTotal')}</span>
              <span className="text-2xl font-bold text-[--color-primary]">฿{total.toFixed(2)}</span>
            </div>

            {checkoutError && (
              <p className="text-sm text-[--color-error] text-center">{checkoutError}</p>
            )}
            <Button
              size="xl"
              className="w-full mt-4"
              onClick={() => void handlePlaceOrder()}
              disabled={checkoutBusy}
            >
              {checkoutBusy ? t('paymentPlacingOrder') : t('paymentPlaceOrder')}
            </Button>
            <div className="flex items-center justify-center gap-2 mt-4 text-[--color-on-surface-variant] text-xs">
              <ShieldCheck className="w-4 h-4 text-[--color-secondary]" />
              {t('paymentSecureNote')}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
