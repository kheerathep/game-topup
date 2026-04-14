-- คอลัมน์สำหรับตัวกรองตลาดซื้อขาย: ราคา (query จาก price), Flash Sale, Bundle, ขายดี (sales_count)
alter table public.products add column if not exists is_flash_sale boolean not null default false;
alter table public.products add column if not exists is_bundle boolean not null default false;
alter table public.products add column if not exists sales_count integer not null default 0 check (sales_count >= 0);

comment on column public.products.is_flash_sale is 'แสดงในตัวกรอง Flash Sale';
comment on column public.products.is_bundle is 'แสดงในตัวกรอง Bundle Deals';
comment on column public.products.sales_count is 'ใช้เรียงขายดี — อัปเดตจากแอดมินหรือ job วิเคราะห์ยอดขาย';
