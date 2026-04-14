import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'th';

interface Translations {
  [key: string]: {
    en: string;
    th: string;
  };
}

const translations: Translations = {
  home: { en: 'Home', th: 'หน้าแรก' },
  marketplace: { en: 'Marketplace', th: 'ตลาดซื้อขาย' },
  topups: { en: 'Top-ups', th: 'เติมเงิน' },
  loading: { en: 'Loading…', th: 'กำลังโหลด…' },
  gameTopupNav: { en: 'Game top-up', th: 'เติมเกม' },
  gameTopupTitle: { en: 'Choose your game', th: 'เลือกเกมที่ต้องการเติม' },
  gameTopupSubtitle: {
    en: 'Top up currency, buy items, in-game goods, or game packages — data from your catalog.',
    th: 'เติมเงิน ซื้อของ ไอเทมในเกม หรือแพ็กเกจ — ข้อมูลจากฐานข้อมูลของคุณ',
  },
  gameTopupSearchPlaceholder: { en: 'Search game name…', th: 'ค้นหาชื่อเกม…' },
  gameTopupEmpty: { en: 'No games listed yet.', th: 'ยังไม่มีเกมในระบบ' },
  gameTopupEmptyHint: {
    en: 'Run supabase/patch_games_topup.sql and add rows in the games table.',
    th: 'รัน supabase/patch_games_topup.sql แล้วเพิ่มเกมในตาราง games',
  },
  gameTopupEnter: { en: 'Enter', th: 'เข้าสู่หน้าเกม' },
  gameTopupNotFound: { en: 'Game not found.', th: 'ไม่พบเกมนี้' },
  gameTopupItems: { en: 'items', th: 'รายการ' },
  gameTopupDetail: { en: 'Details & options', th: 'รายละเอียดและตัวเลือก' },
  gameTopupNoProducts: {
    en: 'No products linked to this game yet. Set game_id on products in Supabase.',
    th: 'ยังไม่มีสินค้าผูกกับเกมนี้ — ตั้งค่า game_id ในตาราง products',
  },
  offerTopupCurrency: { en: 'Top up', th: 'เติมเงิน / เติมเกม' },
  offerTopupCurrencyDesc: {
    en: 'Diamonds, UC, crystals, and other wallet top-ups.',
    th: 'เพชร UC คริสตัล และการเติมวอลเล็ตในเกม',
  },
  offerShopItem: { en: 'Shop items', th: 'ซื้อของ' },
  offerShopItemDesc: { en: 'Official shop codes and vouchers.', th: 'โค้ดร้านค้าและบัตรเติมเงิน' },
  offerIngameItem: { en: 'In-game items', th: 'ซื้อของในเกม' },
  offerIngameItemDesc: { en: 'Skins, passes, and direct in-game goods.', th: 'สกิน พาส และไอเทมในเกม' },
  offerGamePackage: { en: 'Game packages', th: 'แพ็กเกจเกม' },
  offerGamePackageDesc: { en: 'Bundles and special packs.', th: 'แพ็กรวมและชุดพิเศษ' },
  buyGames: { en: 'Buy Games', th: 'ซื้อเกม' },
  navBuyGameId: { en: 'Game ID', th: 'ซื้อไอดีเกม' },
  buyGameIdTitle: { en: 'Buy game accounts & IDs', th: 'ซื้อไอดี / บัญชีเกม' },
  buyGameIdSubtitle: {
    en: 'Verified listings by platform. Add to cart and check out securely.',
    th: 'เลือกแพลตฟอร์ม แยกตามมือถือ พีซี คอนโซล — ใส่ตะกร้าและชำระเงินได้ทันที',
  },
  buyGameIdSearchPlaceholder: { en: 'Search by name…', th: 'ค้นหาชื่อสินค้า…' },
  buyGameIdEmpty: {
    en: 'No account products yet. Add rows with category = account in Supabase.',
    th: 'ยังไม่มีสินค้าไอดี — เพิ่มใน products โดยตั้ง category = account',
  },
  buyGameIdAnyPlatform: { en: 'All platforms', th: 'ทุกแพลตฟอร์ม' },
  buyGamesEmptyHint: {
    en: 'Store-only SKUs use products with game_id empty in Supabase. Top-up items stay linked to a game.',
    th: 'สินค้าหน้าซื้อเกมต้องไม่ผูก game_id ในฐานข้อมูล — รายการเติมเกมให้ผูกกับเกมในหน้าเติมเกม',
  },
  buyGamesStoreTitle: { en: 'GAME', th: 'เกม' },
  buyGamesStoreSubtitle: {
    en: 'Digital keys & full games from your catalog.',
    th: 'คีย์ดิจิทัลและเกมเต็มจากแคตตาล็อกของคุณ',
  },
  buyGamesFilters: { en: 'Filters', th: 'ตัวกรอง' },
  buyGamesFilterSearch: { en: 'Search', th: 'ค้นหา' },
  buyGamesFilterCategory: { en: 'Category', th: 'หมวดหมู่' },
  buyGamesFilterCategoryGames: { en: 'Games', th: 'เกม' },
  buyGamesFilterPlatform: { en: 'Platform', th: 'แพลตฟอร์ม' },
  buyGamesFilterAny: { en: 'Any', th: 'ทั้งหมด' },
  buyGamesFilterGenre: { en: 'Genre', th: 'แนวเกม' },
  buyGamesFilterGenreAll: { en: 'All genres', th: 'ทุกแนว' },
  buyGamesGenresLoadError: {
    en: 'Could not load genres — run patch_game_genres_and_stock.sql in Supabase.',
    th: 'โหลดแนวเกมไม่ได้ — รัน patch_game_genres_and_stock.sql ใน Supabase',
  },
  buyGamesFilterStockAll: { en: 'Any availability', th: 'ทุกสถานะ' },
  buyGamesFilterInStockOnly: { en: 'In stock only', th: 'เฉพาะพร้อมขาย' },
  buyGamesFilterOutOfStock: { en: 'Out of stock only', th: 'เฉพาะหมดสต็อก' },
  buyGamesOutOfStock: { en: 'Out of stock', th: 'หมดชั่วคราว' },
  buyGamesAddDisabled: { en: 'Unavailable', th: 'ไม่พร้อมขาย' },
  buyGamesSearchPlaceholder: { en: 'Search titles…', th: 'ค้นหาชื่อสินค้า…' },
  buyGamesFilterPrice: { en: 'Price (THB)', th: 'ราคา (บาท)' },
  buyGamesFilterAvailability: { en: 'Availability', th: 'พร้อมขาย' },
  buyGamesFilterInStock: { en: 'In stock', th: 'มีสินค้า' },
  buyGamesFilterFlashOnly: { en: 'Featured / flash sale only', th: 'เฉพาะแนะนำ / แฟลชเซลล์' },
  buyGamesSortBy: { en: 'Sort by', th: 'เรียงตาม' },
  buyGamesSortNew: { en: 'Newest', th: 'มาใหม่' },
  buyGamesSortBestsellers: { en: 'Best sellers', th: 'ขายดี' },
  buyGamesSortPriceLow: { en: 'Price: low → high', th: 'ราคา: ต่ำไปสูง' },
  buyGamesSortPriceHigh: { en: 'Price: high → low', th: 'ราคา: สูงไปต่ำ' },
  buyGamesViewGrid: { en: 'Grid', th: 'ตาราง' },
  buyGamesViewList: { en: 'List', th: 'รายการ' },
  buyGamesResults: { en: 'results', th: 'รายการ' },
  buyGamesFeatured: { en: 'FEATURED', th: 'แนะนำ' },
  buyGamesSold: { en: 'sold', th: 'ขายแล้ว' },
  login: { en: 'Login', th: 'เข้าสู่ระบบ' },
  logout: { en: 'Log out', th: 'ออกจากระบบ' },
  register: { en: 'Register', th: 'สมัครสมาชิก' },
  language: { en: 'Language', th: 'ภาษา' },
  cart: { en: 'Cart', th: 'ตะกร้าสินค้า' },
  search: { en: 'Search games...', th: 'ค้นหาเกม...' },
  quickRecharge: { en: 'Quick Recharge', th: 'เติมเงินด่วน' },
  instantPowerUp: { en: 'Instant Power Up', th: 'เติมไว ทันใจ' },
  findYourPlatform: { en: 'Find Your Platform', th: 'เลือกแพลตฟอร์มของคุณ' },
  homeMainCategoriesTitle: { en: 'Main services', th: 'บริการหลัก' },
  homeCatGameTopupTitle: { en: 'Game top-up', th: 'เติมเกม' },
  homeCatGameTopupSub: {
    en: 'Diamonds, UC, packs and in-game top-ups.',
    th: 'เติมเพชร ยูซี แพ็กเกจ และสินค้าเติมในเกม',
  },
  homeCatIdGameTitle: { en: 'Game ID', th: 'ไอดีเกม' },
  homeCatIdGameSub: {
    en: 'Game accounts and player IDs.',
    th: 'บัญชีเกมและไอดีผู้เล่น',
  },
  homeCatBuyGameTitle: { en: 'Buy games', th: 'ซื้อเกม' },
  homeCatBuyGameSub: {
    en: 'Full games and digital keys.',
    th: 'เกมเต็มและคีย์ดิจิทัล',
  },
  homeTrendingLine: { en: 'Trending — staff picks', th: 'กำลังฮิต — แนะนำ' },
  homeDigitalSectionTitle: { en: 'Digital top-ups & cards', th: 'เติมเงินและบัตรดิจิทัล' },
  homeConfigLoading: { en: 'Loading home settings…', th: 'กำลังโหลดการตั้งค่า…' },
  productTypeTopup: { en: 'Top-up', th: 'เติมเกม' },
  productTypeAccount: { en: 'Account', th: 'บัญชีเกม' },
  catalogSidebarBrowse: { en: 'Browse', th: 'เลือกหมวด' },
  catalogSidebarNav: { en: 'Main sections', th: 'เมนูหลัก' },
  catalogSidebarSearchPlaceholder: { en: 'Search… (syncs across pages)', th: 'ค้นหา… (เชื่อมทุกหน้า)' },
  marketplaceFilterTitle: { en: 'Browse by category', th: 'เลือกหมวดสินค้า' },
  priceRange: { en: 'Price range', th: 'ช่วงราคา' },
  minPrice: { en: 'Min', th: 'ต่ำสุด' },
  maxPrice: { en: 'Max', th: 'สูงสุด' },
  flashSale: { en: 'Flash Sale', th: 'แฟลชเซลล์' },
  bundleDeals: { en: 'Bundle Deals', th: 'แพ็กเกจรวม' },
  specialOffers: { en: 'Special Offers', th: 'ข้อเสนอพิเศษ' },
  catalogAll: { en: 'All', th: 'ทั้งหมด' },
  catalogMobile: { en: 'Mobile', th: 'มือถือ' },
  catalogPC: { en: 'PC', th: 'พีซี' },
  catalogAccount: { en: 'Account', th: 'บัญชีเกม' },
  catalogPlayStation: { en: 'PlayStation', th: 'เพลย์สเตชัน' },
  catalogXbox: { en: 'Xbox', th: 'เอ็กซ์บ็อกซ์' },
  catalogSwitch: { en: 'Nintendo Switch', th: 'นินเทนโด สวิตช์' },
  eliteFullGames: { en: 'Full Games', th: 'เกมเต็ม' },
  eliteGiftCards: { en: 'Gift Cards', th: 'บัตรของขวัญ' },
  eliteInGame: { en: 'In-Game Items', th: 'ไอเทมในเกม' },
  eliteMovies: { en: 'Movies & Media', th: 'ภาพยนตร์และมีเดีย' },
  eliteFullGamesSub: { en: 'Latest AAA Titles & Indies', th: 'เกม AAA และอินดี้ล่าสุด' },
  trending: { en: 'Trending', th: 'กำลังฮิต' },
  newArrivals: { en: 'New Arrivals', th: 'มาใหม่' },
  bestSellers: { en: 'Best Sellers', th: 'ขายดี' },
  addToCart: { en: 'Add to Cart', th: 'เพิ่มลงตะกร้า' },
  checkout: { en: 'Checkout', th: 'ชำระเงิน' },
  checkoutPerUnit: { en: '/ ea.', th: '/ ชิ้น' },
  checkoutQtyDec: { en: 'Decrease quantity', th: 'ลดจำนวน' },
  checkoutQtyInc: { en: 'Increase quantity', th: 'เพิ่มจำนวน' },
  checkoutRemoveLine: { en: 'Remove item', th: 'ลบรายการ' },
  price: { en: 'Price', th: 'ราคา' },
  delivery: { en: 'Instant Delivery', th: 'จัดส่งทันที' },
  selectAmount: { en: 'Select Amount', th: 'เลือกจำนวน' },
  playerIdentity: { en: 'Player Identity', th: 'ข้อมูลผู้เล่น' },
  enterPlayerId: { en: 'Enter your Player ID (e.g., 123456789)', th: 'กรอก Player ID (เช่น 123456789)' },
  gameDetailNotFound: { en: 'Product not found.', th: 'ไม่พบสินค้า' },
  gameDetailDefaultDescription: {
    en: 'Instantly top up {name} with ease. Official partner guaranteeing safe transactions.',
    th: 'เติม {name} ได้ทันที ปลอดภัย ผ่านพาร์ทเนอร์ทางการ',
  },
  gameDetailFullAccess: { en: 'Full account access', th: 'เต็มรูปแบบ / บัญชี' },
  gameDetailBasePackage: { en: 'Standard package', th: 'แพ็กเกจมาตรฐาน' },
  gameDetailLoginHint: {
    en: 'You can review the cart after signing in.',
    th: 'ล็อกอินเพื่อไปชำระเงิน — ระบบจะพาไปหน้าเข้าสู่ระบบ',
  },
  gameDetailAddCheckout: { en: 'Add to Cart & Checkout', th: 'ใส่ตะกร้าและชำระเงิน' },
  gameDetailBuyNow: { en: 'Buy now', th: 'ซื้อเลย' },
  gameDetailAddedToCart: { en: 'Added to cart', th: 'ใส่ตะกร้าแล้ว' },
  gameDetailQuantity: { en: 'Quantity', th: 'จำนวน' },
  cartPageTitle: { en: 'Shopping cart', th: 'ตะกร้าสินค้า' },
  cartEmptyTitle: { en: 'Your cart is empty.', th: 'ตะกร้าว่าง' },
  cartReturnStore: { en: 'Return to store', th: 'กลับไปหน้าร้าน' },
  cartContinueShopping: { en: 'Continue shopping', th: 'เลือกซื้อต่อ' },
  cartNoPromoNote: {
    en: 'No coupons or coin discounts — pay the listed price only.',
    th: 'ไม่มีคูปองหรือเหรียญส่วนลด — ชำระตามราคาที่แสดงเท่านั้น',
  },
  cartSelectAll: { en: 'Select all', th: 'เลือกทั้งหมด' },
  cartSelectedCount: { en: '{n} of {total} selected', th: 'เลือก {n} จาก {total} รายการ' },
  cartSubtotalSelected: { en: 'Subtotal (selected)', th: 'ยอดรวม (รายการที่เลือก)' },
  cartProceedPay: { en: 'Proceed to payment', th: 'ไปชำระเงิน' },
  cartPickOne: { en: 'Select at least one item to pay.', th: 'เลือกสินค้าอย่างน้อย 1 รายการเพื่อชำระเงิน' },
  paymentPageTitle: { en: 'Payment', th: 'ชำระเงิน' },
  paymentBackToCart: { en: 'Back to cart', th: 'กลับไปตะกร้า' },
  paymentOrderSummary: { en: 'Order summary', th: 'สรุปคำสั่งซื้อ' },
  paymentTotal: { en: 'Total', th: 'รวม' },
  paymentPlaceOrder: { en: 'Place order', th: 'ยืนยันคำสั่งซื้อ' },
  paymentPlacingOrder: { en: 'Placing order…', th: 'กำลังสร้างออเดอร์…' },
  paymentSecureNote: { en: 'Secure checkout', th: 'ชำระเงินปลอดภัย' },
  paymentMethodCard: { en: 'Credit card', th: 'บัตรเครดิต' },
  paymentMethodQr: { en: 'QR PromptPay', th: 'QR พร้อมเพย์' },
  paymentGatewayHeading: { en: 'Payment details', th: 'รายละเอียดการชำระ' },
  paymentCardNumber: { en: 'Card number', th: 'หมายเลขบัตร' },
  paymentCardExpiry: { en: 'Expiry (MM/YY)', th: 'วันหมดอายุ (ดด/ปป)' },
  paymentCardCvc: { en: 'CVC', th: 'CVC' },
  paymentCardName: { en: 'Name on card', th: 'ชื่อบนบัตร' },
  paymentQrHint: {
    en: 'Scan with any Thai banking app. Demo — no real charge.',
    th: 'สแกนผ่านแอปธนาคาร (ทดสอบ — ไม่มีการตัดเงินจริง)',
  },
  adminCatalogUploadTitle: { en: 'Catalog image URL', th: 'ลิงก์รูปแคตตาล็อก' },
  adminCatalogUploadIntro: {
    en: 'Paste an image URL or choose a file. After upload, copy the URL into products, games, or home content in Supabase. Requires Storage bucket `catalog` and admin role (see supabase/patch_storage_catalog.sql).',
    th: 'วาง URL รูปหรือเลือกไฟล์ หลังอัปโหลดแล้วคัดลอก URL ไปใส่ใน products, games หรือหน้าแรกใน Supabase ต้องรัน patch Storage และเป็น admin',
  },
  adminCatalogUploadDenied: { en: 'Admins only', th: 'สำหรับผู้ดูแลระบบเท่านั้น' },
  adminCatalogUploadDeniedHint: {
    en: 'Sign in with an account whose profile role is admin.',
    th: 'ล็อกอินด้วยบัญชีที่ตั้ง role = admin ในตาราง profiles',
  },
  imageUploadLabel: { en: 'Image URL', th: 'ที่อยู่รูป (URL)' },
  imageUploadChooseFile: { en: 'Choose image file', th: 'เลือกไฟล์รูป' },
  imageUploadOrPaste: { en: 'JPEG / PNG / WebP / GIF, max 5 MB', th: 'JPEG PNG WebP GIF ไม่เกิน 5 MB' },
  imageUploading: { en: 'Uploading…', th: 'กำลังอัปโหลด…' },
  imageUploadFailed: { en: 'Upload failed', th: 'อัปโหลดไม่สำเร็จ' },
  imageUploadCopyUrl: { en: 'Copy URL', th: 'คัดลอก URL' },
  imageUploadCopied: { en: 'Copied', th: 'คัดลอกแล้ว' },
  imageUploadFolder: { en: 'Upload folder', th: 'โฟลเดอร์เก็บไฟล์' },
  adminArea: { en: 'Admin', th: 'ผู้ดูแล' },
  adminAreaSub: { en: 'Store management', th: 'จัดการร้าน' },
  adminNavDashboard: { en: 'Dashboard', th: 'แดชบอร์ด' },
  adminNavOrders: { en: 'Orders', th: 'คำสั่งซื้อ' },
  adminNavCategories: { en: 'Categories', th: 'หมวดหมู่' },
  adminNavProducts: { en: 'Products', th: 'สินค้า' },
  adminNavBanners: { en: 'Banners', th: 'แบนเนอร์' },
  adminNavSettings: { en: 'Settings & payment', th: 'ตั้งค่าและชำระเงิน' },
  adminNavCatalogUpload: { en: 'Image upload', th: 'อัปโหลดรูป' },
  adminBackStore: { en: 'Back to store', th: 'กลับหน้าร้าน' },
  adminDashboardIntro: {
    en: 'Overview of orders, revenue, and catalog size.',
    th: 'ภาพรวมออเดอร์ รายได้ และจำนวนสินค้า',
  },
  adminLoadFailed: { en: 'Could not load statistics.', th: 'โหลดสถิติไม่สำเร็จ' },
  adminStatOrders: { en: 'Total orders', th: 'ออเดอร์ทั้งหมด' },
  adminStatPending: { en: 'Pending', th: 'รอชำระ' },
  adminStatPaid: { en: 'Paid', th: 'ชำระแล้ว' },
  adminStatCancelled: { en: 'Cancelled', th: 'ยกเลิก' },
  adminStatProducts: { en: 'Products', th: 'สินค้า' },
  adminStatRevenue: { en: 'Revenue (paid)', th: 'รายได้ (ชำระแล้ว)' },
  adminOrdersIntro: {
    en: 'Change order status and view line items.',
    th: 'เปลี่ยนสถานะและดูรายการสินค้าในออเดอร์',
  },
  adminColOrder: { en: 'Order', th: 'ออเดอร์' },
  adminColDate: { en: 'Date', th: 'วันที่' },
  adminColCustomer: { en: 'Customer', th: 'ลูกค้า' },
  adminColTotal: { en: 'Total', th: 'ยอด' },
  adminColStatus: { en: 'Status', th: 'สถานะ' },
  adminColName: { en: 'Name', th: 'ชื่อ' },
  adminColCategory: { en: 'Category', th: 'หมวด' },
  adminColPrice: { en: 'Price', th: 'ราคา' },
  adminColStock: { en: 'Stock', th: 'พร้อมขาย' },
  adminDetails: { en: 'Details', th: 'รายละเอียด' },
  adminHide: { en: 'Hide', th: 'ซ่อน' },
  adminPaymentMethod: { en: 'Payment', th: 'ชำระเงิน' },
  adminPageOf: { en: 'Page {p} / {n}', th: 'หน้า {p} / {n}' },
  adminPrev: { en: 'Previous', th: 'ก่อนหน้า' },
  adminNext: { en: 'Next', th: 'ถัดไป' },
  adminCategoriesIntro: {
    en: 'Game genres for /buy-games filters (table game_genres).',
    th: 'แนวเกมสำหรับกรองหน้า /buy-games (ตาราง game_genres)',
  },
  adminGenreForm: { en: 'Create or edit genre', th: 'สร้างหรือแก้แนวเกม' },
  adminActive: { en: 'Active', th: 'ใช้งาน' },
  adminSave: { en: 'Save', th: 'บันทึก' },
  adminCreate: { en: 'Create', th: 'สร้าง' },
  adminCancel: { en: 'Cancel', th: 'ยกเลิก' },
  adminEdit: { en: 'Edit', th: 'แก้ไข' },
  adminDelete: { en: 'Delete', th: 'ลบ' },
  adminConfirmDelete: { en: 'Delete this row?', th: 'ลบรายการนี้?' },
  adminProductsIntro: {
    en: 'List and remove products. Edit data in Supabase or extend the UI later.',
    th: 'รายการและลบสินค้า แก้ข้อมูลใน Supabase หรือขยาย UI ภายหลัง',
  },
  adminSearchProducts: { en: 'Search name or id…', th: 'ค้นหาชื่อหรือ id…' },
  adminProductHint: {
    en: 'New products: insert via Supabase or API; full editor can be added later.',
    th: 'สินค้าใหม่: เพิ่มผ่าน Supabase หรือ API จะมีฟอร์มแก้ไขเต็มในภายหลังได้',
  },
  adminBannersIntro: {
    en: 'Home hero and platform strip (home_hero, home_platforms).',
    th: 'แบนเนอร์หน้าแรกและแถบแพลตฟอร์ม (home_hero, home_platforms)',
  },
  adminHeroTitle: { en: 'Hero banner', th: 'แบนเนอร์หลัก' },
  adminSaveHero: { en: 'Save hero', th: 'บันทึกแบนเนอร์' },
  adminPlatformsTitle: { en: 'Platform shortcuts', th: 'ทางลัดแพลตฟอร์ม' },
  adminSettingsIntro: {
    en: 'Payment instructions and bank details shown to customers (site_settings).',
    th: 'คำแนะนำการโอนและบัญชีธนาลูกค้า (site_settings)',
  },
  adminPayInstrEn: { en: 'Payment instructions (EN)', th: 'คำแนะนำชำระเงิน (EN)' },
  adminPayInstrTh: { en: 'Payment instructions (TH)', th: 'คำแนะนำชำระเงิน (TH)' },
  adminBankName: { en: 'Bank name', th: 'ชื่อธนาคาร' },
  adminAccountName: { en: 'Account name', th: 'ชื่อบัญชี' },
  adminAccountNo: { en: 'Account number', th: 'เลขบัญชี' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
