-- เกมสำหรับหน้าเติมเกม (แบบ richmanshop) + ประเภทสินค้าในแต่ละเกม
-- รันหลัง schema หลัก
-- ถ้ายังไม่มี public.is_admin() ให้รัน supabase/patch_rls_is_admin.sql ก่อน

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

do $$ begin
  create type public.offer_kind as enum ('topup_currency', 'shop_item', 'ingame_item', 'game_package');
exception when duplicate_object then null; end $$;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_th text,
  description text,
  image_url text not null,
  banner_url text,
  platform public.product_category not null default 'mobile',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists game_id uuid references public.games (id) on delete set null;
alter table public.products add column if not exists offer_kind public.offer_kind;

create index if not exists idx_products_game_id on public.products (game_id);
create index if not exists idx_games_platform on public.games (platform);

comment on column public.products.game_id is 'เชื่อมสินค้ากับเกมในหน้า /marketplace/:slug — ถ้า null แสดงในหน้า /buy-games (สินค้าเกมเต็ม/แยกจากเติมเกม)';
comment on column public.products.offer_kind is 'topup_currency=เติมเงิน, shop_item=ซื้อของ, ingame_item=ในเกม, game_package=แพ็กเกจ';

alter table public.games enable row level security;

drop policy if exists "games_public_read" on public.games;
create policy "games_public_read" on public.games for select using (is_active = true);

drop policy if exists "games_admin_all" on public.games;
create policy "games_admin_all" on public.games for all using (public.is_admin()) with check (public.is_admin());

-- ตัวอย่างเกม (แก้รูปได้ใน Table Editor)
insert into public.games (slug, name, name_th, image_url, description, platform, sort_order)
values (
  'mobile-legends-bang-bang',
  'Mobile Legends: Bang Bang',
  'Mobile Legends: Bang Bang',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDCDJ0UtGstJPTAcEN927XwLzAnedqY7zNXqqYeAv5pR0GNhQr5Kbkov2jrmLDzZDoxoUKvwDOze0hLL8_e0qkMaRlufXU-tOlwj80Lvf3wxumII9sEvpIAxDgJrRo9X2v4ZqzXaZPezz1gb9HkSh0zC2d6x9gcLcZoDnpDZUEKd7k5PSCl4UA3F9C6-PaEpe6lkTJ9xQvSKvyZpJ9Ky-EEzIPEEP9RgA_rFeKpn1b2U66HNUFa3dA3AOga8hs0zJotj8PvxS-DW9gt',
  'เติมเพชร สกิน แพ็กเกจ และไอเทมในเกม',
  'mobile',
  0
)
on conflict (slug) do nothing;

-- คำอธิบายเกมแยกภาษา (รัน patch_games_description_i18n.sql เต็ม ๆ ถ้าต้องการ backfill)
alter table public.games add column if not exists description_en text;
alter table public.games add column if not exists description_th text;

-- แพลตฟอร์มสินค้าไอดี (รัน patch_products_account_platform.sql เต็ม ๆ สำหรับ index + seed)
alter table public.products add column if not exists account_platform public.product_category;
