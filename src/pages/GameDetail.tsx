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
import { cn } from '../lib/utils';

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

const PLATFORM_STYLES: Record<string, string> = {
  mobile: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  pc: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  playstation: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  xbox: 'bg-green-600/20 text-green-400 border-green-600/30',
  switch: 'bg-red-600/20 text-red-400 border-red-600/30',
  account: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
};

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

  const maxOrderQty = useMemo(() => {
    if (!product) return 99;
    if (!product.track_inventory) return 99;
    return Math.min(99, Math.max(0, product.stock_quantity ?? 0));
  }, [product]);

  const hasSellableStock =
    product != null &&
    product.in_stock !== false &&
    (!product.track_inventory || (product.stock_quantity ?? 0) >= qty);

  const canAddToCart = product != null && topupReady && qty >= 1 && hasSellableStock;

  useEffect(() => {
    if (!product?.track_inventory) return;
    const cap = Math.min(99, Math.max(0, product.stock_quantity ?? 0));
    if (cap === 0) return;
    setQty((q) => Math.min(q, cap));
  }, [product?.id, product?.track_inventory, product?.stock_quantity]);

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

  const platformStyle = PLATFORM_STYLES[product.category] || PLATFORM_STYLES.mobile;
  const inStock = product.in_stock !== false && (!product.track_inventory || (product.stock_quantity ?? 0) > 0);
  const lowStock = product.track_inventory && (product.stock_quantity ?? 0) > 0 && (product.stock_quantity ?? 0) <= 5;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left: Product Images */}
        <div className="w-full lg:w-[45%] flex flex-col gap-4">
          <Card className="p-0 overflow-hidden bg-[--color-surface-dim] border-white/5 shadow-2xl">
            <div className="relative aspect-[4/3] w-full bg-black/40">
              <img
                src={galleryImages[activeImage] ?? product.image_url}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-white/5 bg-black/20 p-3 no-scrollbar">
                {galleryImages.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`cursor-pointer h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all transition-transform active:scale-95 ${
                      i === activeImage
                        ? 'border-[--color-primary] ring-4 ring-[--color-primary]/20'
                        : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Product Info & Purchase Info */}
        <div className="flex-1 flex flex-col gap-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", platformStyle)}>
                {t(categoryLabelKey)}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-white/70">
                {typeLine}
              </span>
              {inStock ? (
                <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20")}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {lowStock ? `${t('adminStockRemaining')} ${product.stock_quantity}` : t('storeInStock')}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
                  {t('storeStockOut')}
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight capitalize tracking-tight">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-[--color-primary] tracking-tight">
                ฿{unitPrice.toLocaleString()}
              </span>
              {qty > 1 && (
                <span className="text-lg text-on-surface-variant font-medium">
                  × {qty} = <span className="text-white">฿{(unitPrice * qty).toLocaleString()}</span>
                </span>
              )}
            </div>

            <p className="text-on-surface-variant leading-relaxed max-w-2xl text-lg">
              {product.description || t('gameDetailDefaultDescription').replace(/\{name\}/g, product.name)}
            </p>
          </div>

          <div className="h-px bg-white/10 w-full" />
          <div className="flex flex-col gap-6">
            {needsPlayerId && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[--color-primary]/20 flex items-center justify-center text-[--color-primary] font-bold text-sm">
                    1
                  </div>
                  <h2 className="text-xl font-bold text-white">{t('playerIdentity')}</h2>
                </div>
                <div className="max-w-md">
                  <Input
                    placeholder={t('enterPlayerId')}
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    className="h-14 text-lg bg-white/5 border-white/10"
                    aria-required
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[--color-primary]/20 flex items-center justify-center text-[--color-primary] font-bold text-sm">
                  {needsPlayerId ? '2' : '1'}
                </div>
                <h2 className="text-xl font-bold text-white">{t('selectAmount')}</h2>
              </div>

              {product.type === 'topup' && hasTierOptions ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {optionPrices.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedOption(opt)}
                      className={`cursor-pointer flex flex-col items-start p-5 rounded-2xl border transition-all duration-300 group ${
                        selectedOption === opt
                          ? 'bg-[--color-primary]/10 border-[--color-primary] text-[--color-primary] shadow-[0_0_20px_rgba(98,138,255,0.25)]'
                          : 'bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1 text-white'
                      }`}
                    >
                      <Diamond className={cn("w-5 h-5 mb-3 transition-opacity", selectedOption === opt ? "opacity-100" : "opacity-40 group-hover:opacity-100")} />
                      <span className="font-black text-2xl">฿{opt.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="max-w-md">
                  <div className="p-5 rounded-2xl border border-[--color-primary]/40 bg-[--color-primary]/10 text-[--color-primary] flex items-center justify-between shadow-lg">
                    <span className="font-bold text-lg">
                      {product.type === 'account' ? t('gameDetailFullAccess') : t('gameDetailBasePackage')}
                    </span>
                    <span className="font-black text-3xl">฿{basePrice.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">{t('gameDetailQuantity')}</h2>
              <div className="flex w-fit items-center rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-inner">
                <button
                  type="button"
                  aria-label={t('checkoutQtyDec')}
                  disabled={qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="cursor-pointer flex h-12 w-12 items-center justify-center rounded-xl text-on-surface-variant transition-all hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed active:scale-90"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="min-w-[4rem] text-center text-2xl font-black tabular-nums text-white">{qty}</span>
                <button
                  type="button"
                  aria-label={t('checkoutQtyInc')}
                  disabled={qty >= maxOrderQty || maxOrderQty === 0}
                  onClick={() => setQty((q) => Math.min(maxOrderQty, q + 1))}
                  className="cursor-pointer flex h-12 w-12 items-center justify-center rounded-xl text-on-surface-variant transition-all hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed active:scale-90"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="pt-6 space-y-4 border-t border-white/10">
              {cartHint && (
                <p className="text-sm font-bold text-emerald-400 animate-bounce">{t('gameDetailAddedToCart')} ✨</p>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="secondary" 
                  size="xl" 
                  className="flex-1 py-6 text-xl" 
                  disabled={!canAddToCart} 
                  onClick={handleAddToCart}
                >
                  {t('addToCart')}
                </Button>
                <Button 
                  size="xl" 
                  className="flex-1 py-6 text-xl shadow-[0_0_30px_rgba(98,138,255,0.3)]" 
                  disabled={!canAddToCart} 
                  onClick={handleBuyNow}
                >
                  {t('gameDetailBuyNow')}
                </Button>
              </div>
              {!auth.user && (
                <p className="text-sm text-center text-on-surface-variant">{t('gameDetailLoginHint')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
