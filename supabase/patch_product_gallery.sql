-- รูปสินค้าหลายใบ — รันใน Supabase SQL Editor
-- หน้า product ใช้ image_url เป็นหลัก + gallery_urls เป็นรูปเสริมในแกลเลอรี

alter table public.products add column if not exists gallery_urls text[] null;

comment on column public.products.gallery_urls is 'URL รูปเพิ่มเติม (carousel) — image_url ยังเป็นรูปหลักในการ์ด/ลิสต์';
