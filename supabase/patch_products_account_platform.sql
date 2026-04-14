-- แพลตฟอร์มของสินค้าไอดี/บัญชี — กรองหน้า /buy-game-id
alter table public.products add column if not exists account_platform public.product_category;

comment on column public.products.account_platform is 'แพลตฟอร์มที่ไอดี/บัญชีนี้ใช้ (mobile, pc, playstation, xbox, switch) — null = แสดงทุกแท็บกรอง';

create index if not exists idx_products_account_platform on public.products (account_platform)
  where category = 'account';

-- ตัวอย่าง: ตั้งแพลตฟอร์มให้สินค้า category = account ที่มีอยู่
update public.products
set account_platform = 'mobile'
where category = 'account' and account_platform is null;
