import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { getProductsByIds } from '../services/api';
import { createOrder, setOrderPaymentSlipUrl } from '../services/orders';
import { uploadPaymentSlip } from '../services/storageUpload';
import { getSiteSettings } from '../services/siteSettings';
import {
  stripePromise,
  createPaymentIntent,
  isStripeConfigured,
  isStripeTestMode,
  type PaymentMethodType,
} from '../services/stripe';
import type { OrderItem, Product, SiteSettings } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CreditCard, QrCode, ShieldCheck, AlertCircle, TestTube2, Building2, Upload } from 'lucide-react';
import { isCheckoutLineSelected } from '../context/CartContext';

// Stripe React Elements (lazy import — only needed when Stripe is configured)
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

/* ─────────────────────────────────────────────
   Sub-component: Stripe Card Payment Form
   ───────────────────────────────────────────── */
interface StripeCardFormProps {
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
}

function StripeCardForm({ onSuccess, onError, busy, setBusy }: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setBusy(true);
    onError('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Stripe redirects here after 3DS / bank auth if needed
        return_url: `${window.location.origin}/checkout/payment`,
      },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message ?? 'Payment failed');
      setBusy(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      onError('Payment status: ' + (paymentIntent?.status ?? 'unknown'));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          fields: { billingDetails: { name: 'auto' } },
        }}
      />
      <Button
        type="submit"
        size="xl"
        className="w-full mt-2"
        disabled={busy || !stripe || !elements}
      >
        {busy ? 'Processing...' : 'Pay Now'}
      </Button>
    </form>
  );
}

/* ─────────────────────────────────────────────
   Sub-component: PromptPay QR
   ───────────────────────────────────────────── */
interface PromptPayFormProps {
  clientSecret: string;
  /** Stripe PromptPay requires billing_details.email */
  payerEmail: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  total: number;
}

function PromptPayForm({
  clientSecret,
  payerEmail,
  onSuccess,
  onError,
  busy,
  setBusy,
  total,
}: PromptPayFormProps) {
  const stripe = useStripe();
  const { t } = useLanguage();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // Retrieve PromptPay QR from PaymentIntent
  useEffect(() => {
    if (!stripe || !clientSecret) return;

    void (async () => {
      setBusy(true);
      if (!payerEmail.trim()) {
        onError(t('promptPayEmailRequired'));
        setBusy(false);
        return;
      }

      const { error } = await stripe.retrievePaymentIntent(clientSecret);
      if (error) {
        onError(error.message ?? 'Could not load PromptPay details');
        setBusy(false);
        return;
      }

      // Confirm with promptpay to generate QR (email is required by Stripe for PromptPay)
      const result = await stripe.confirmPromptPayPayment(clientSecret, {
        payment_method: {
          billing_details: {
            name: 'Customer',
            email: payerEmail.trim(),
          },
        },
      });

      if (result.error) {
        onError(result.error.message ?? 'PromptPay error');
      } else {
        const nextAction = result.paymentIntent?.next_action;
        const imageUrl = (nextAction as { promptpay_display_qr_code?: { image_url_png?: string } } | null)
          ?.promptpay_display_qr_code?.image_url_png;
        setQrUrl(imageUrl ?? null);

        // Poll every 3s to detect payment completion
        setPolling(true);
      }
      setBusy(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe, clientSecret, payerEmail]);

  // Polling for PromptPay completion (run once immediately, then every 3s)
  useEffect(() => {
    if (!polling || !stripe || !clientSecret) return;

    const intervalRef: { current: ReturnType<typeof setInterval> | undefined } = {
      current: undefined,
    };
    const check = () => {
      void stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
        if (paymentIntent?.status === 'succeeded') {
          if (intervalRef.current != null) clearInterval(intervalRef.current);
          setPolling(false);
          onSuccess(paymentIntent.id);
        }
      });
    };
    check();
    intervalRef.current = setInterval(check, 3000);
    return () => {
      if (intervalRef.current != null) clearInterval(intervalRef.current);
    };
  }, [polling, stripe, clientSecret, onSuccess]);

  return (
    <div className="space-y-6 flex flex-col items-center justify-center py-6">
      {busy && (
        <div className="text-on-surface-variant text-sm">Generating QR code...</div>
      )}

      {qrUrl && (
        <>
          <div className="bg-white p-4 rounded-xl shadow-lg">
            <img src={qrUrl} alt="PromptPay QR Code" className="w-48 h-48" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-bold text-white">฿{total.toFixed(2)}</p>
            <p className="text-sm text-on-surface-variant">
              Scan with your banking app to pay
            </p>
            {polling && (
              <p className="text-xs text-[--color-primary] animate-pulse mt-2">
                Waiting for payment confirmation...
              </p>
            )}
          </div>
        </>
      )}

      {!qrUrl && !busy && (
        <div className="bg-white/5 p-8 rounded-xl flex flex-col items-center gap-3 border border-white/10">
          <QrCode className="w-24 h-24 text-white/30" />
          <p className="text-sm text-on-surface-variant text-center">
            Could not generate QR code. Please try card payment.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Helper
   ───────────────────────────────────────────── */
function stripCheckoutMeta(items: OrderItem[]): OrderItem[] {
  return items.map((item) => {
    const { checkout_selected, ...rest } = item;
    void checkout_selected;
    return rest;
  });
}

type CheckoutPaymentLocationState = {
  checkoutLineIds?: string[];
};

const SESSION_STRIPE_ORDER = 'stripe_order_id';
const SESSION_STRIPE_LINE_IDS = 'stripe_checkout_line_ids';

/* ─────────────────────────────────────────────
   Main page component
   ───────────────────────────────────────────── */
export function CheckoutPayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { state: cart, dispatch: cartDispatch } = useCart();
  const { state: auth } = useAuth();

  const [method, setMethod] = useState<'credit_card' | 'qr' | 'bank_transfer'>('credit_card');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState('');

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  /** DB order id for the current PaymentIntent — keeps QR/card success working if sessionStorage is cleared */
  const [stripeCheckoutOrderId, setStripeCheckoutOrderId] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState('');
  const [intentLoading, setIntentLoading] = useState(false);

  // Order creation state
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [bankSlipFile, setBankSlipFile] = useState<File | null>(null);
  const [bankSlipPreviewUrl, setBankSlipPreviewUrl] = useState<string | null>(null);

  /** After 3DS / redirect, Stripe sends ?payment_intent_client_secret=…&redirect_status=… */
  const isStripeRedirectReturn = useMemo(() => {
    return Boolean(
      searchParams.get('payment_intent_client_secret') && searchParams.get('redirect_status'),
    );
  }, [searchParams]);

  /** Avoid double-processing the same Stripe return (e.g. React Strict Mode). */
  const stripeReturnCompletedSecret = useRef<string | null>(null);

  /**
   * After navigate(/order/…), cart clears in a microtask. Until the route unmounts this page,
   * empty-cart guards would otherwise send the user to /checkout and “win” the navigation race.
   */
  const bypassEmptyCartGuardRef = useRef(false);

  const idsFromCartNav = (location.state as CheckoutPaymentLocationState | null)?.checkoutLineIds;

  const selectedItems = useMemo(() => {
    if (idsFromCartNav != null && idsFromCartNav.length > 0) {
      const allow = new Set(idsFromCartNav);
      return cart.items.filter((i) => allow.has(i.id));
    }
    return cart.items.filter(isCheckoutLineSelected);
  }, [cart.items, idsFromCartNav]);

  const total = useMemo(
    () => selectedItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0),
    [selectedItems],
  );

  const goToOrderSuccess = useCallback(
    (orderId: string, lineIds: string[]) => {
      bypassEmptyCartGuardRef.current = true;
      navigate(`/order/${orderId}`, { replace: true });
      queueMicrotask(() => {
        if (lineIds.length > 0) {
          cartDispatch({ type: 'REMOVE_LINES', payload: lineIds });
        }
      });
    },
    [navigate, cartDispatch],
  );

  useEffect(() => {
    const ids = [...new Set(selectedItems.map((i) => i.product_id))];
    if (ids.length === 0) { setProducts([]); return; }
    setProductsError('');
    void getProductsByIds(ids)
      .then(setProducts)
      .catch((e) => setProductsError(e instanceof Error ? e.message : 'Could not load catalog'));
  }, [selectedItems]);

  useEffect(() => {
    if (method !== 'bank_transfer') return;
    setSettingsLoading(true);
    void getSiteSettings().then((s) => {
      setSiteSettings(s);
      setSettingsLoading(false);
    });
  }, [method]);

  useEffect(() => {
    return () => {
      if (bankSlipPreviewUrl) URL.revokeObjectURL(bankSlipPreviewUrl);
    };
  }, [bankSlipPreviewUrl]);

  useEffect(() => {
    if (!searchParams.get('payment_intent_client_secret')) {
      stripeReturnCompletedSecret.current = null;
    }
  }, [searchParams]);

  /* ── Complete flow after Stripe redirect (confirmPayment callback does not run on full page reload) ── */
  useEffect(() => {
    if (!isStripeRedirectReturn || !stripePromise) return;

    const clientSecretParam = searchParams.get('payment_intent_client_secret');
    const redirectStatus = searchParams.get('redirect_status');
    if (!clientSecretParam || !redirectStatus) return;

    if (redirectStatus === 'failed') {
      setCheckoutError('Payment was not completed.');
      setSearchParams({}, { replace: true });
      return;
    }

    let cancelled = false;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    void (async () => {
      const stripe = await stripePromise;
      if (!stripe || cancelled) return;

      const first = await stripe.retrievePaymentIntent(clientSecretParam);
      if (first.error) {
        if (!cancelled) setCheckoutError(first.error.message ?? 'Could not verify payment');
        stripeReturnCompletedSecret.current = null;
        setSearchParams({}, { replace: true });
        return;
      }

      let paymentIntent = first.paymentIntent;

      // Async confirmation: poll until succeeded or terminal state
      let attempts = 0;
      while (
        paymentIntent &&
        (paymentIntent.status === 'processing' || paymentIntent.status === 'requires_action') &&
        attempts < 20
      ) {
        await sleep(500);
        const next = await stripe.retrievePaymentIntent(clientSecretParam);
        if (cancelled) return;
        if (!next.paymentIntent) break;
        paymentIntent = next.paymentIntent;
        attempts += 1;
      }

      if (cancelled || !paymentIntent) return;

      if (paymentIntent.status !== 'succeeded') {
        setCheckoutError('Payment status: ' + paymentIntent.status);
        stripeReturnCompletedSecret.current = null;
        setSearchParams({}, { replace: true });
        return;
      }

      const meta = paymentIntent as { metadata?: Record<string, string> };
      const orderId =
        meta.metadata?.orderId ?? sessionStorage.getItem(SESSION_STRIPE_ORDER);
      if (!orderId) {
        setCheckoutError('Order reference missing after payment.');
        stripeReturnCompletedSecret.current = null;
        setSearchParams({}, { replace: true });
        return;
      }

      if (stripeReturnCompletedSecret.current === clientSecretParam) return;
      stripeReturnCompletedSecret.current = clientSecretParam;

      sessionStorage.removeItem(SESSION_STRIPE_ORDER);
      const raw = sessionStorage.getItem(SESSION_STRIPE_LINE_IDS);
      sessionStorage.removeItem(SESSION_STRIPE_LINE_IDS);
      let lineIds: string[] = [];
      if (raw) {
        try {
          lineIds = JSON.parse(raw) as string[];
        } catch {
          lineIds = [];
        }
      }
      setSearchParams({}, { replace: true });
      goToOrderSuccess(orderId, lineIds);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isStripeRedirectReturn,
    searchParams,
    stripePromise,
    goToOrderSuccess,
    setSearchParams,
  ]);

  /* ── Create order in DB then fetch Stripe PaymentIntent ── */
  const initializeStripePayment = useCallback(async (paymentMethod: PaymentMethodType) => {
    if (!auth.user) {
      navigate('/login', { state: { from: '/checkout/payment' } });
      return;
    }

    setStripeError('');
    setClientSecret(null);
    setStripeCheckoutOrderId(null);
    setIntentLoading(true);

    try {
      // 1. Create order in Supabase (status = 'pending')
      const forDb = stripCheckoutMeta(selectedItems);
      const dbMethod = paymentMethod === 'card' ? 'credit_card' : 'qr';
      const { orderId, error: orderError } = await createOrder(auth.user.id, forDb, total, dbMethod);

      if (orderError) {
        setStripeError(
          orderError.message === 'INSUFFICIENT_STOCK' ? t('checkoutStockError') : orderError.message,
        );
        return;
      }

      // 2. Create Stripe PaymentIntent via Edge Function
      const { clientSecret: cs, error: piError } = await createPaymentIntent(
        total,
        orderId,
        paymentMethod,
      );

      if (piError || !cs) {
        setStripeError(piError ?? 'Could not initialize payment');
        return;
      }

      setClientSecret(cs);
      setStripeCheckoutOrderId(orderId);
      sessionStorage.setItem(SESSION_STRIPE_ORDER, orderId);
      sessionStorage.setItem(
        SESSION_STRIPE_LINE_IDS,
        JSON.stringify(selectedItems.map((i) => i.id)),
      );
    } finally {
      setIntentLoading(false);
    }
  }, [auth.user, navigate, selectedItems, total, t]);

  /* ── Finalize: clear cart and redirect to /order/:id ── */
  const handlePaymentSuccess = useCallback(
    async (paymentIntentId: string) => {
      void paymentIntentId;
      const rawLines = sessionStorage.getItem(SESSION_STRIPE_LINE_IDS);
      const sidOrder = sessionStorage.getItem(SESSION_STRIPE_ORDER);
      sessionStorage.removeItem(SESSION_STRIPE_ORDER);
      sessionStorage.removeItem(SESSION_STRIPE_LINE_IDS);

      let orderId: string | null = stripeCheckoutOrderId ?? sidOrder ?? null;
      setStripeCheckoutOrderId(null);

      if (!orderId && clientSecret && stripePromise) {
        try {
          const stripe = await stripePromise;
          if (stripe) {
            const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
            const meta = paymentIntent as { metadata?: Record<string, string> } | null;
            orderId = meta?.metadata?.orderId ?? null;
          }
        } catch {
          /* ignore */
        }
      }

      if (!orderId || orderId.startsWith('pi_')) {
        setStripeError(t('paymentOrderResolveError'));
        return;
      }

      let lineIds = selectedItems.map((i) => i.id);
      if (lineIds.length === 0 && rawLines) {
        try {
          lineIds = JSON.parse(rawLines) as string[];
        } catch {
          lineIds = [];
        }
      }

      goToOrderSuccess(orderId, lineIds);
    },
    [
      stripeCheckoutOrderId,
      clientSecret,
      stripePromise,
      goToOrderSuccess,
      selectedItems,
      t,
    ],
  );

  const handleBankTransferOrder = useCallback(async () => {
    if (!auth.user) {
      navigate('/login', { state: { from: '/checkout/payment' } });
      return;
    }
    setCheckoutError('');
    setCheckoutBusy(true);
    try {
      const forDb = stripCheckoutMeta(selectedItems);
      const lineIds = selectedItems.map((i) => i.id);
      const { orderId, error, persisted } = await createOrder(auth.user.id, forDb, total, 'bank_transfer');
      if (error) {
        setCheckoutError(error.message === 'INSUFFICIENT_STOCK' ? t('checkoutStockError') : error.message);
        return;
      }

      if (bankSlipFile && persisted) {
        try {
          const publicUrl = await uploadPaymentSlip(bankSlipFile, auth.user.id, orderId);
          const { error: slipErr } = await setOrderPaymentSlipUrl(orderId, publicUrl);
          if (slipErr) {
            setCheckoutError(slipErr.message);
            return;
          }
        } catch (e) {
          setCheckoutError(e instanceof Error ? e.message : 'Upload failed');
          return;
        }
      }

      setBankSlipFile(null);
      setBankSlipPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });

      goToOrderSuccess(orderId, lineIds);
    } finally {
      setCheckoutBusy(false);
    }
  }, [auth.user, bankSlipFile, goToOrderSuccess, navigate, selectedItems, t, total]);

  /* ── Fallback: place order without Stripe (when not configured) ── */
  const handlePlaceOrderFallback = async () => {
    if (!auth.user) {
      navigate('/login', { state: { from: '/checkout/payment' } });
      return;
    }
    setCheckoutError('');
    setCheckoutBusy(true);
    try {
      const forDb = stripCheckoutMeta(selectedItems);
      const lineIds = selectedItems.map((i) => i.id);
      const dbMethod =
        method === 'credit_card' ? 'credit_card' : method === 'qr' ? 'qr' : 'bank_transfer';
      const { orderId, error } = await createOrder(auth.user.id, forDb, total, dbMethod);
      if (error) {
        setCheckoutError(error.message === 'INSUFFICIENT_STOCK' ? t('checkoutStockError') : error.message);
        return;
      }
      goToOrderSuccess(orderId, lineIds);
    } finally {
      setCheckoutBusy(false);
    }
  };

  const stripeReady = isStripeConfigured();
  const isTestMode = isStripeTestMode();

  const stripeElementsOptions = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#6366f1',
        colorBackground: '#1a1b26',
        colorText: '#e2e3ef',
        colorDanger: '#f87171',
        fontFamily: '"Inter", system-ui, sans-serif',
        borderRadius: '10px',
        spacingUnit: '4px',
      },
    },
  } : undefined;

  if (cart.items.length === 0 && !isStripeRedirectReturn && !bypassEmptyCartGuardRef.current) {
    return <Navigate to="/checkout" replace />;
  }

  if (selectedItems.length === 0 && !isStripeRedirectReturn && !bypassEmptyCartGuardRef.current) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-on-surface-variant">{t('cartPickOne')}</p>
        <Button type="button" onClick={() => navigate('/checkout')}>{t('paymentBackToCart')}</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full flex flex-col lg:flex-row gap-8">
      {/* ── Left: Payment section ── */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{t('paymentPageTitle')}</h1>
            {isTestMode && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                <TestTube2 className="w-3 h-3" />
                Test Mode
              </span>
            )}
          </div>
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

        {/* ── Test Mode Banner ── */}
        {stripeReady && isTestMode && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-amber-300">
            <TestTube2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Stripe Test Mode Active</p>
              <p className="text-amber-300/70 text-xs mt-0.5">
                Use test card <code className="font-mono bg-amber-400/10 px-1 rounded">4242 4242 4242 4242</code>, any future expiry, any 3-digit CVC. No real money will be charged.
              </p>
              <p className="text-amber-300/60 text-xs mt-2">{t('stripeTestBannerExtra')}</p>
            </div>
          </div>
        )}

        {/* ── Not configured banner ── */}
        {!stripeReady && (
          <div className="flex items-start gap-3 rounded-xl border border-[--color-error]/20 bg-[--color-error]/5 px-4 py-3 text-[--color-error]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Stripe not configured</p>
              <p className="opacity-70 text-xs mt-0.5">
                Add <code className="font-mono bg-white/10 px-1 rounded">VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...</code> to your <code className="font-mono">.env</code> file and restart the dev server.
              </p>
            </div>
          </div>
        )}

        {/* ── Method selector (always 3 columns so “bank” is not below the fold on mobile) ── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-4xl">
          {[
            { id: 'credit_card' as const, label: t('paymentMethodCard'), icon: CreditCard },
            { id: 'qr' as const, label: t('paymentMethodQr'), icon: QrCode },
            { id: 'bank_transfer' as const, label: t('paymentMethodBank'), icon: Building2 },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setMethod(opt.id);
                setClientSecret(null);
                setStripeCheckoutOrderId(null);
                setStripeError('');
                setBankSlipFile(null);
                setBankSlipPreviewUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl border transition-all text-center min-h-[4.25rem] sm:min-h-0 ${
                method === opt.id
                  ? 'bg-[--color-primary]/10 border-[--color-primary] text-[--color-primary]'
                  : 'bg-[--color-surface-container] border-transparent text-on-surface hover:bg-[--color-surface-variant]'
              }`}
            >
              <opt.icon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              <span className="font-bold text-[10px] leading-tight sm:text-sm">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* ── Payment form area ── */}
        <Card className="mt-2 border border-[--color-ghost-border] bg-[--color-surface-container]">

          {/* ── BANK TRANSFER (offline; details from site_settings) ── */}
          {method === 'bank_transfer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Building2 /> {t('paymentMethodBank')}
              </h3>
              <p className="text-sm text-on-surface-variant">{t('paymentBankIntro')}</p>
              {settingsLoading && (
                <div className="flex items-center gap-3 py-4 text-on-surface-variant text-sm">
                  <span className="w-5 h-5 border-2 border-[--color-primary] border-t-transparent rounded-full animate-spin" />
                  {t('loading')}
                </div>
              )}
              {!settingsLoading && siteSettings && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm">
                  {siteSettings.bank_name && (
                    <p>
                      <span className="text-on-surface-variant">{t('adminBankName')}: </span>
                      <span className="font-medium text-on-surface">{siteSettings.bank_name}</span>
                    </p>
                  )}
                  {siteSettings.bank_account_name && (
                    <p>
                      <span className="text-on-surface-variant">{t('adminAccountName')}: </span>
                      <span className="font-medium text-on-surface">{siteSettings.bank_account_name}</span>
                    </p>
                  )}
                  {siteSettings.bank_account_number && (
                    <p className="font-mono">
                      <span className="text-on-surface-variant">{t('adminAccountNo')}: </span>
                      <span className="font-medium text-on-surface">{siteSettings.bank_account_number}</span>
                    </p>
                  )}
                  {(language === 'th' ? siteSettings.payment_instructions_th : siteSettings.payment_instructions_en) && (
                    <p className="text-on-surface-variant whitespace-pre-wrap pt-2 border-t border-white/10">
                      {language === 'th'
                        ? siteSettings.payment_instructions_th
                        : siteSettings.payment_instructions_en}
                    </p>
                  )}
                </div>
              )}
              {!settingsLoading &&
                siteSettings &&
                !siteSettings.bank_name &&
                !siteSettings.bank_account_number &&
                !(language === 'th' ? siteSettings.payment_instructions_th : siteSettings.payment_instructions_en) && (
                <p className="text-sm text-amber-300/90">{t('paymentBankMissingSettings')}</p>
              )}
              <p className="text-xs text-on-surface-variant">{t('paymentBankPendingNote')}</p>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <p className="text-sm font-medium text-on-surface flex items-center gap-2">
                  <Upload className="w-4 h-4 shrink-0" />
                  {t('paymentBankSlipLabel')}
                </p>
                <p className="text-xs text-on-surface-variant">{t('paymentBankSlipHint')}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setBankSlipPreviewUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return f ? URL.createObjectURL(f) : null;
                        });
                        setBankSlipFile(f);
                        e.target.value = '';
                      }}
                    />
                    <span className="inline-flex items-center rounded-lg bg-[--color-primary]/20 px-4 py-2 text-sm font-bold text-[--color-primary] border border-[--color-primary]/30 hover:bg-[--color-primary]/30">
                      {t('paymentBankSlipChoose')}
                    </span>
                  </label>
                  {bankSlipFile && (
                    <button
                      type="button"
                      className="text-xs text-on-surface-variant underline"
                      onClick={() => {
                        setBankSlipFile(null);
                        setBankSlipPreviewUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return null;
                        });
                      }}
                    >
                      {t('paymentBankSlipClear')}
                    </button>
                  )}
                </div>
                {bankSlipPreviewUrl && (
                  <div className="relative inline-block max-w-full">
                    <img
                      src={bankSlipPreviewUrl}
                      alt=""
                      className="max-h-40 rounded-lg border border-white/10 object-contain"
                    />
                  </div>
                )}
              </div>

              <Button
                size="xl"
                className="w-full"
                onClick={() => void handleBankTransferOrder()}
                disabled={checkoutBusy}
              >
                {checkoutBusy ? t('paymentPlacingOrder') : t('paymentBankConfirm')}
              </Button>
            </div>
          )}

          {/* ── STRIPE CARD ── */}
          {method === 'credit_card' && stripeReady && (
            <>
              {!clientSecret && !intentLoading && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <CreditCard /> {t('paymentGatewayHeading')}
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    Payment is securely processed by Stripe. Click "Continue" to enter your card details.
                  </p>
                  <Button
                    size="xl"
                    className="w-full"
                    onClick={() => void initializeStripePayment('card')}
                  >
                    Continue to Payment
                  </Button>
                </div>
              )}

              {intentLoading && (
                <div className="flex items-center gap-3 py-8 justify-center text-on-surface-variant">
                  <span className="w-5 h-5 border-2 border-[--color-primary] border-t-transparent rounded-full animate-spin" />
                  Preparing payment...
                </div>
              )}

              {clientSecret && stripePromise && stripeElementsOptions && (
                <Elements stripe={stripePromise} options={stripeElementsOptions}>
                  <StripeCardForm
                    busy={checkoutBusy}
                    setBusy={setCheckoutBusy}
                    onSuccess={handlePaymentSuccess}
                    onError={setCheckoutError}
                  />
                </Elements>
              )}
            </>
          )}

          {/* ── STRIPE PROMPTPAY ── */}
          {method === 'qr' && stripeReady && (
            <>
              {!clientSecret && !intentLoading && (
                <div className="space-y-6 flex flex-col items-center py-8">
                  <div className="bg-white/5 p-8 rounded-xl flex flex-col items-center gap-3 border border-white/10">
                    <QrCode className="w-24 h-24 text-white/30" />
                    <p className="text-sm text-on-surface-variant text-center">
                      Click below to generate your PromptPay QR code
                    </p>
                  </div>
                  <Button
                    size="xl"
                    className="w-full max-w-sm"
                    onClick={() => void initializeStripePayment('promptpay')}
                  >
                    Generate QR Code
                  </Button>
                </div>
              )}

              {intentLoading && (
                <div className="flex items-center gap-3 py-12 justify-center text-on-surface-variant">
                  <span className="w-5 h-5 border-2 border-[--color-primary] border-t-transparent rounded-full animate-spin" />
                  Generating QR code...
                </div>
              )}

              {clientSecret && stripePromise && stripeElementsOptions && (
                <Elements stripe={stripePromise} options={stripeElementsOptions}>
                  <PromptPayForm
                    clientSecret={clientSecret}
                    payerEmail={auth.user?.email ?? ''}
                    busy={intentLoading}
                    setBusy={setIntentLoading}
                    onSuccess={handlePaymentSuccess}
                    onError={setStripeError}
                    total={total}
                  />
                </Elements>
              )}
            </>
          )}

          {/* ── FALLBACK (Stripe not configured) ── */}
          {!stripeReady && method !== 'bank_transfer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                {method === 'credit_card' ? <CreditCard /> : <QrCode />}
                {method === 'credit_card' ? t('paymentGatewayHeading') : 'PromptPay / QR'}
              </h3>
              <p className="text-sm text-on-surface-variant">
                {method === 'credit_card'
                  ? 'Card payment requires Stripe to be configured.'
                  : 'PromptPay QR requires Stripe to be configured.'}
              </p>
              <p className="text-xs text-on-surface-variant opacity-60">
                You can still place the order as "pending" for demo purposes.
              </p>
            </div>
          )}

          {/* ── Error messages ── */}
          {(stripeError || checkoutError) && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[--color-error]/20 bg-[--color-error]/5 px-3 py-2 text-[--color-error] text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {stripeError || checkoutError}
            </div>
          )}
        </Card>

        {/* ── Fallback place order button (card / QR demo only — bank has its own button) ── */}
        {!stripeReady && method !== 'bank_transfer' && (
          <Button
            size="xl"
            className="w-full max-w-2xl"
            onClick={() => void handlePlaceOrderFallback()}
            disabled={checkoutBusy}
          >
            {checkoutBusy ? t('paymentPlacingOrder') : `${t('paymentPlaceOrder')} (Demo)`}
          </Button>
        )}
      </div>

      {/* ── Right: Order summary ── */}
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

            <div className="flex items-center justify-center gap-2 text-[--color-on-surface-variant] text-xs">
              <ShieldCheck className="w-4 h-4 text-[--color-secondary]" />
              {t('paymentSecureNote')}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
