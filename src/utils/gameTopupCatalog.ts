import type { OfferKind, Product } from '../types';

export const OFFER_SECTIONS: {
  kind: OfferKind;
  titleKey: string;
  descKey: string;
  anchor: string;
}[] = [
  {
    kind: 'topup_currency',
    titleKey: 'offerTopupCurrency',
    descKey: 'offerTopupCurrencyDesc',
    anchor: 'topup',
  },
  {
    kind: 'shop_item',
    titleKey: 'offerShopItem',
    descKey: 'offerShopItemDesc',
    anchor: 'shop',
  },
  {
    kind: 'ingame_item',
    titleKey: 'offerIngameItem',
    descKey: 'offerIngameItemDesc',
    anchor: 'ingame',
  },
  {
    kind: 'game_package',
    titleKey: 'offerGamePackage',
    descKey: 'offerGamePackageDesc',
    anchor: 'package',
  },
];

/** สินค้าในหมวด — ถ้า offer_kind เป็น null ถือว่าเป็นเติมเงิน/เติมเกม */
export function productsForOfferKind(products: Product[], kind: OfferKind): Product[] {
  if (kind === 'topup_currency') {
    return products.filter((p) => !p.offer_kind || p.offer_kind === 'topup_currency');
  }
  return products.filter((p) => p.offer_kind === kind);
}
