-- รวม platform เข้า category เดียว (ไม่ซ้ำซ้อน) + ลบคอลัมน์ platform / type store_platform
-- รันครั้งเดียวใน Supabase SQL Editor

-- 1) ขยาย enum product_category
do $$ begin
  alter type public.product_category add value 'playstation';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type public.product_category add value 'xbox';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type public.product_category add value 'switch';
exception when duplicate_object then null; end $$;

-- 2) ย้ายค่าจาก platform → category แล้วลบคอลัมน์ platform (ถ้ามี)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'platform'
  ) then
    update public.products
    set category = 'playstation'::public.product_category
    where platform::text = 'playstation';
    update public.products
    set category = 'xbox'::public.product_category
    where platform::text = 'xbox';
    update public.products
    set category = 'switch'::public.product_category
    where platform::text = 'switch';
    update public.products
    set category = 'pc'::public.product_category
    where platform::text = 'pc';
    update public.products
    set category = 'mobile'::public.product_category
    where platform::text = 'mobile';
    alter table public.products drop column platform;
  end if;
end $$;

drop type if exists public.store_platform;

-- 3) ลิงก์หน้าแรก → ใช้แค่ ?category= (ไม่ใช้ ?platform=)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'home_platforms'
  ) then
    update public.home_platforms set href = '/marketplace?category=pc' where label = 'PC Gaming';
    update public.home_platforms set href = '/marketplace?category=playstation' where label = 'PlayStation';
    update public.home_platforms set href = '/marketplace?category=xbox' where label in ('Xbox One', 'Xbox');
    update public.home_platforms set href = '/marketplace?category=switch' where label = 'Switch';
    update public.home_platforms set href = '/marketplace?category=mobile' where label = 'Mobile';
  end if;
end $$;
