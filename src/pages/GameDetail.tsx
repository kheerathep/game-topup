import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { useCart } from '../hooks/useCart.tsx';
import { getProductById } from '../services/api';
import type { OfferKind, Product } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { CATALOG_CATEGORY_OPTIONS, parseProductPrice } from '../utils/marketplaceFilters';
import { normalizePriceOptions } from '../utils/productOptions';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Diamond, Minus, Plus } from 'lucide-react';
import { productNeedsPlayerId } from '../utils/productNeedsPlayerId';

function offerKindLabelKey(k: OfferKind | null | undefined): string | null {
  if (!k) return null;
  const m: Record<OfferKind, string> = {
    topup_currency: 'offerTopupCurrency',
    shop_item: 'offerShopItem',
    ingame_item: 'offerIngameItem',
    game_package: 'offerGamePackage',
  };
  return m[k] ?? null;
}

export function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { state: auth } = useAuth();
  const { dispatch: cartDispatch } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [cartHint, setCartHint] = useState(false);
  const cartHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoadError(null);
    setIsLoading(true);
    void getProductById(id)
      .then((data) => {
        setProduct(data ?? null);
        setSelectedOption(null);
        setPlayerId('');
        setQty(1);
        setActiveImage(0);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : 'Failed to load product');
        setProduct(null);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!cartHint) return;
    if (cartHintTimer.current) clearTimeout(cartHintTimer.current);
    cartHintTimer.current = setTimeout(() => {
      setCartHint(false);
      cartHintTimer.current = null;
    }, 2600);
    return () => {
      if (cartHintTimer.current) clearTimeout(cartHintTimer.current);
    };
  }, [cartHint]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const main = product.image_url;
    const extra = (product.gallery_urls ?? []).filter((u): u is string => Boolean(u && u.trim()));
    const ordered = [main, ...extra.filter((u) => u !== main)];
    return [...new Set(ordered)];
  }, [product]);

  const optionPrices = useMemo(() => (product ? normalizePriceOptions(product.options) : []), [product]);
  const basePrice = product ? parseProductPrice(product.price) : 0;
  const hasTierOptions = optionPrices.length > 0;

  const needsPlayerId = product != null && productNeedsPlayerId(product);
  const topupReady =
    !needsPlayerId ||
    (playerId.trim().length > 0 && (hasTierOptions ? selectedOption != null : true));

  const canAddToCart = product != null && topupReady && qty >= 1;

  if (isLoading) {
    return (
      <div className="p-20 text-center text-on-surface-variant">
        {t('loading')}
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-[--color-error]">{loadError}</p>
        <Link to="/marketplace" className="text-[--color-primary] font-bold uppercase tracking-widest text-sm">
          {t('gameTopupNav')}
        </Link>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-on-surface-variant">{t('gameDetailNotFound')}</p>
        <Link to="/marketplace" className="text-[--color-primary] font-bold uppercase tracking-widest text-sm">
          {t('gameTopupNav')}
        </Link>
      </div>
    );
  }

  const categoryLabelKey =
    CATALOG_CATEGORY_OPTIONS.find((o) => o.value === product.category)?.labelKey ?? 'catalogAll';
  const offerKey = offerKindLabelKey(product.offer_kind);
  const typeLine = offerKey ? t(offerKey) : product.type.toUpperCase();

  const unitPrice =
    product.type === 'topup' && hasTierOptions && selectedOption != null ? selectedOption : basePrice;

  const linePayload = () => ({
    id: crypto.randomUUID(),
    order_id: '',
    product_id: product.id,
    quantity: qty,
    unit_price: unitPrice,
    player_id: needsPlayerId ? playerId.trim() : undefined,
    selected_option:
      product.type === 'topup' && hasTierOptions && selectedOption != null ? selectedOption : undefined,
  });

  const handleAddToCart = () => {
    if (!canAddToCart) return;
    if (!auth.user) {
      navigate('/login', { state: { from: `/product/${product.id}` } });
      return;
    }
    cartDispatch({ type: 'ADD_ITEM', payload: linePayload() });
    setCartHint(true);
  };

  const handleBuyNow = () => {
    if (!canAddToCart) return;
    if (!auth.user) {
      navigate('/login', { state: { from: `/product/${product.id}` } });
      return;
    }
    cartDispatch({ type: 'ADD_ITEM_PAY_SOLO', payload: linePayload() });
    navigate('/checkout/payment');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        <Card className="p-0 overflow-hidden bg-[--color-surface] border-transparent">
          <div className="relative aspect-video w-full bg-black">
            <img
              src={galleryImages[activeImage] ?? product.image_url}
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
          {galleryImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-t border-[--color-ghost-border] bg-black/40 p-3">
              {galleryImages.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    i === activeImage
                      ? 'border-[--color-primary] ring-2 ring-[--color-primary]/40'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-2 text-white">{product.name}</h1>
            <p className="text-sm text-[--color-secondary] font-mono tracking-wider">
              {t(categoryLabelKey)} • {typeLine}
            </p>
            <p className="mt-4 text-sm text-on-surface-variant leading-relaxed">
              {product.description ||
                t('gameDetailDefaultDescription').replace(/\{name\}/g, product.name)}
            </p>
          </div>
        </Card>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        {needsPlayerId && (
          <Card className="p-6 space-y-4 border border-[--color-ghost-border] bg-[--color-surface-container]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[--color-primary]/20 flex items-center justify-center text-[--color-primary] font-bold text-sm">
                1
              </div>
              <h2 className="text-xl font-bold text-white">{t('playerIdentity')}</h2>
            </div>
            <div className="pl-11 pr-4">
              <Input
                placeholder={t('enterPlayerId')}
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                aria-required
              />
            </div>
          </Card>
        )}

        <Card className="p-6 space-y-6 border border-[--color-ghost-border] bg-[--color-surface-container]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[--color-primary]/20 flex items-center justify-center text-[--color-primary] font-bold text-sm">
              {needsPlayerId ? '2' : '1'}
            </div>
            <h2 className="text-xl font-bold text-white">{t('selectAmount')}</h2>
          </div>

          {product.type === 'topup' && hasTierOptions ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pl-0 md:pl-11">
              {optionPrices.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedOption(opt)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${
                    selectedOption === opt
                      ? 'bg-[--color-primary-dim]/20 border-[--color-primary] text-[--color-primary]'
                      : 'bg-[--color-surface-container-high] border-[--color-ghost-border] hover:bg-[--color-surface-variant] text-white'
                  }`}
                >
                  <Diamond className="w-6 h-6 mb-2 opacity-90" />
                  <span className="font-bold text-lg">฿{opt.toLocaleString()}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="pl-0 md:pl-11 pr-4">
              <div className="p-4 rounded-xl border border-[--color-primary] bg-[--color-primary-dim]/20 text-[--color-primary] flex items-center justify-between">
                <span className="font-bold">
                  {product.type === 'account' ? t('gameDetailFullAccess') : t('gameDetailBasePackage')}
                </span>
                <span className="font-bold text-xl">฿{basePrice.toLocaleString()}</span>
              </div>
            </div>
          )}
        </Card>

        <Card className="border border-[--color-ghost-border] bg-[--color-surface-container] p-6">
          <h2 className="mb-3 text-lg font-bold text-white">{t('gameDetailQuantity')}</h2>
          <div className="flex max-w-xs items-center rounded-xl border border-white/10 bg-black/25 p-1">
            <button
              type="button"
              aria-label={t('checkoutQtyDec')}
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center text-lg font-bold tabular-nums text-white">{qty}</span>
            <button
              type="button"
              aria-label={t('checkoutQtyInc')}
              disabled={qty >= 99}
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </Card>

        <div className="flex flex-col items-stretch gap-3 pt-2 sm:items-end">
          {!auth.user && (
            <p className="text-xs text-on-surface-variant sm:text-right max-w-md">{t('gameDetailLoginHint')}</p>
          )}
          {cartHint && (
            <p className="text-sm font-bold text-[--color-secondary] sm:text-right">{t('gameDetailAddedToCart')}</p>
          )}
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-end">
            <Button variant="secondary" size="xl" className="w-full sm:w-auto" disabled={!canAddToCart} onClick={handleAddToCart}>
              {t('addToCart')}
            </Button>
            <Button size="xl" className="w-full sm:w-auto" disabled={!canAddToCart} onClick={handleBuyNow}>
              {t('gameDetailBuyNow')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
