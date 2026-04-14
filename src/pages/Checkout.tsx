import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useLanguage } from '../context/LanguageContext';
import { getProductsByIds } from '../services/api';
import type { Product } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Minus, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { isCheckoutLineSelected } from '../context/CartContext';

export function Checkout() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { state: cart, dispatch: cartDispatch } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    const ids = [...new Set(cart.items.map((i) => i.product_id))];
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    setProductsError('');
    void getProductsByIds(ids)
      .then(setProducts)
      .catch((e) => setProductsError(e instanceof Error ? e.message : 'Could not load catalog'));
  }, [cart.items]);

  const selectedLines = cart.items.filter(isCheckoutLineSelected);
  const selectedCount = selectedLines.length;
  const allCount = cart.items.length;
  const allSelected = allCount > 0 && selectedCount === allCount;
  const subtotalSelected = selectedLines.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);

  if (cart.items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-on-surface-variant">{t('cartEmptyTitle')}</h2>
          <Button onClick={() => navigate('/')}>{t('cartReturnStore')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('cartPageTitle')}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t('cartNoPromoNote')}</p>
        </div>
        <Link
          to="/"
          className="text-sm font-bold uppercase tracking-widest text-[--color-primary] hover:underline"
        >
          {t('cartContinueShopping')}
        </Link>
      </div>

      {productsError && <p className="text-sm text-[--color-error]">{productsError}</p>}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[--color-ghost-border] bg-[--color-surface-container]/60 px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-white">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/30 accent-[--color-primary]"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = !allSelected && selectedCount > 0;
            }}
            onChange={() =>
              cartDispatch({ type: 'SET_ALL_CHECKOUT_SELECTED', payload: !allSelected })
            }
          />
          {t('cartSelectAll')}
        </label>
        <span className="text-xs text-on-surface-variant">
          {t('cartSelectedCount')
            .replace('{n}', String(selectedCount))
            .replace('{total}', String(allCount))}
        </span>
      </div>

      <Card className="border border-[--color-ghost-border] bg-[--color-surface-container] p-0 overflow-hidden">
        <div className="divide-y divide-[--color-ghost-border]">
          {cart.items.map((item) => {
            const pkg = products.find((p) => p.id === item.product_id);
            const lineTotal = item.unit_price * item.quantity;
            const ticked = isCheckoutLineSelected(item);
            return (
              <div
                key={item.id}
                className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 ${
                  !ticked ? 'opacity-60' : ''
                }`}
              >
                <label className="flex shrink-0 cursor-pointer items-start gap-3 sm:items-center">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-white/30 accent-[--color-primary] sm:mt-0"
                    checked={ticked}
                    onChange={() =>
                      cartDispatch({ type: 'TOGGLE_CHECKOUT_SELECTED', payload: item.id })
                    }
                  />
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-black">
                    {pkg ? (
                      <img src={pkg.image_url} alt="" className="h-full w-full object-cover opacity-90" />
                    ) : (
                      <div className="h-full w-full bg-[--color-surface-container-high]" />
                    )}
                  </div>
                </label>

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-on-surface">{pkg?.name ?? `Product ${item.product_id.slice(0, 8)}…`}</p>
                  {item.player_id ? (
                    <p className="mt-0.5 truncate text-xs text-on-surface-variant">ID: {item.player_id}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-on-surface-variant">
                    ฿{item.unit_price.toFixed(2)} <span className="opacity-70">{t('checkoutPerUnit')}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                  <div className="flex items-center rounded-lg border border-white/10 bg-black/25 p-0.5">
                    <button
                      type="button"
                      aria-label={t('checkoutQtyDec')}
                      onClick={() =>
                        cartDispatch({
                          type: 'SET_LINE_QUANTITY',
                          payload: { lineId: item.id, quantity: item.quantity - 1 },
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[2rem] text-center text-sm font-bold tabular-nums text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={t('checkoutQtyInc')}
                      onClick={() =>
                        cartDispatch({
                          type: 'SET_LINE_QUANTITY',
                          payload: { lineId: item.id, quantity: item.quantity + 1 },
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[--color-primary]">฿{lineTotal.toFixed(2)}</span>
                    <button
                      type="button"
                      aria-label={t('checkoutRemoveLine')}
                      onClick={() => cartDispatch({ type: 'REMOVE_LINE', payload: item.id })}
                      className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-[--color-error]/15 hover:text-[--color-error]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="sticky bottom-4 border border-[--color-ghost-border] bg-[--color-surface] p-6 sm:static">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-on-surface-variant">{t('cartSubtotalSelected')}</p>
            <p className="text-2xl font-bold text-[--color-primary]">฿{subtotalSelected.toFixed(2)}</p>
          </div>
          <Button
            size="xl"
            className="w-full sm:w-auto sm:min-w-[200px]"
            disabled={selectedCount === 0}
            onClick={() =>
              navigate('/checkout/payment', {
                state: { checkoutLineIds: selectedLines.map((i) => i.id) },
              })
            }
          >
            {t('cartProceedPay')}
          </Button>
        </div>
        {selectedCount === 0 && (
          <p className="mt-2 text-center text-xs text-[--color-error] sm:text-right">{t('cartPickOne')}</p>
        )}
      </Card>
    </div>
  );
}
