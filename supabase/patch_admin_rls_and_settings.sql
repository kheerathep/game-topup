-- Admin: RLS สำหรับดู/แก้ออเดอร์ทั้งหมด + อ่าน profiles ของลูกค้า + ตั้งค่าเว็บ/ชำระเงิน
-- รันหลัง schema.sql และ patch_home_content.sql
-- ใช้ public.is_admin() — รัน supabase/patch_rls_is_admin.sql ก่อนถ้าโปรเจกต์เก่ายังไม่มีฟังก์ชันนี้

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ผู้ดูแลอ่าน profiles ทุกแถว (ใช้แสดงชื่อคู่กับออเดอร์)
drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all" on public.profiles for select using (public.is_admin());

-- ออเดอร์: admin ดูและอัปเดตสถานะได้ (นโยบายเดิม orders_select_own ยังใช้ได้ — OR กัน)
drop policy if exists "orders_admin_select" on public.orders;
create policy "orders_admin_select" on public.orders for select using (public.is_admin());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items_admin_select" on public.order_items;
create policy "order_items_admin_select" on public.order_items for select using (public.is_admin());

-- ตั้งค่าเว็บ / ข้อมูลชำระเงิน (แถวเดียว id=1)
create table if not exists public.site_settings (
  id smallint primary key check (id = 1),
  payment_instructions_en text,
  payment_instructions_th text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  promptpay_id text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings for select using (true);

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

insert into public.site_settings (id) values (1)
on conflict (id) do nothing;
