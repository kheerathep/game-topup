export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  /** Present when mapped from Supabase Auth (OAuth provider, etc.) */
  app_metadata?: { provider?: string };
}

export interface Profile {
  id: string;
  role: 'user' | 'admin';
  display_name: string;
}

/** หมวดสินค้าในฐานข้อมูล (รวมแพลตฟอร์ม — ไม่ใช้คอลัมน์ platform แยก) */
export type ProductCategory = 'mobile' | 'pc' | 'account' | 'playstation' | 'xbox' | 'switch';

/** ประเภทการซื้อในหน้าเกม (เติมเงิน / ซื้อของ / ในเกม / แพ็กเกจ) */
export type OfferKind = 'topup_currency' | 'shop_item' | 'ingame_item' | 'game_package';

/** แนวเกม — ตาราง game_genres (กรองหน้า /buy-games) */
export interface GameGenre {
  id: string;
  slug: string;
  label_en: string;
  label_th: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface Game {
  id: string;
  slug: string;
  name: string;
  name_th?: string | null;
  /** legacy — ใช้ description_en / description_th */
  description?: string | null;
  description_en?: string | null;
  description_th?: string | null;
  image_url: string;
  banner_url?: string | null;
  /** แพลตฟอร์มหลัก — กรองหน้า /marketplace */
  platform: ProductCategory;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url: string;
  /** รูปเพิ่มเติมในหน้ารายละเอียด — รัน patch_product_gallery.sql */
  gallery_urls?: string[] | null;
  category: ProductCategory;
  type: 'topup' | 'account';
  options?: number[];
  is_flash_sale?: boolean;
  is_bundle?: boolean;
  sales_count?: number;
  game_id?: string | null;
  offer_kind?: OfferKind | null;
  /** แพลตฟอร์มสำหรับสินค้า category=account — กรองหน้า /buy-game-id */
  account_platform?: ProductCategory | null;
  /** FK → game_genres — กรองหน้า /buy-games */
  genre_id?: string | null;
  /** false = ไม่พร้อมขาย (ซ่อนจากกรอง "พร้อมขาย" / ปิดปุ่มตะกร้า) */
  in_stock?: boolean;
  /** จำนวนคงคลัง — ใช้เมื่อ track_inventory เป็น true */
  stock_quantity?: number;
  /** true = หักสต็อกเมื่อออเดอร์ paid; false = ไม่จำกัดจำนวน (เติมเกม/ดิจิทัล) */
  track_inventory?: boolean;
  created_at?: string;
}

export interface Order {
  id: string;
  user_id: string;
  total_price: number;
  status: 'pending' | 'paid' | 'cancelled';
  payment_method: 'qr' | 'credit_card' | 'bank_transfer';
  stripe_payment_intent_id?: string | null;
  /** ลิงก์รูปสลิปโอน (bank transfer) หลังอัปโหลด Storage */
  payment_slip_url?: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  // Non-DB UI fields
  player_id?: string;
  selected_option?: number;
  /** หน้าตะกร้า: ติ๊กรวมในยอดชำระครั้งนี้ (ไม่ส่งลง order_items) */
  checkout_selected?: boolean;
}

export interface Message {
  id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

/** ตั้งค่าเว็บ — ตาราง site_settings (รัน supabase/patch_admin_rls_and_settings.sql) */
export interface SiteSettings {
  id: number;
  payment_instructions_en?: string | null;
  payment_instructions_th?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  promptpay_id?: string | null;
  updated_at?: string;
}

/** ออเดอร์ในหน้าแอดมิน — แนบชื่อจาก profiles */
export interface AdminOrderRow extends Order {
  customer_display_name?: string | null;
}
