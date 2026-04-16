-- GameTopup / GameMart — รันใน Supabase SQL Editor
-- auth.users จัดการโดย Supabase Auth อยู่แล้ว (ไม่ต้องสร้าง)
--
-- สคริปต์นี้ idempotent: รันซ้ำได้ + เติมคอลัมน์ที่ขาดในตารางเก่า (เช่น games ไม่มี platform) ก่อนสร้าง index

-- ENUM types (idempotent — รันซ้ำได้ถ้ามี type อยู่แล้ว)
do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.product_category as enum ('mobile', 'pc', 'account', 'playstation', 'xbox', 'switch');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.product_type as enum ('topup', 'account');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'paid', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method as enum ('qr', 'credit_card', 'bank_transfer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.offer_kind as enum ('topup_currency', 'shop_item', 'ingame_item', 'game_package');
exception when duplicate_object then null;
end $$;

-- เกมในหน้าเติมเกม (/marketplace)
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_th text,
  description text,
  description_en text,
  description_th text,
  image_url text not null,
  banner_url text,
  platform public.product_category not null default 'mobile',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ตาราง games เก่าที่สร้างก่อนมี platform — CREATE TABLE IF NOT EXISTS จะไม่แก้โครงสร้าง; ต้อง ALTER ก่อน index
alter table public.games add column if not exists name_th text;
alter table public.games add column if not exists description text;
alter table public.games add column if not exists description_en text;
alter table public.games add column if not exists description_th text;
alter table public.games add column if not exists banner_url text;
alter table public.games add column if not exists platform public.product_category not null default 'mobile';
alter table public.games add column if not exists sort_order int not null default 0;
alter table public.games add column if not exists is_active boolean not null default true;
alter table public.games add column if not exists created_at timestamptz not null default now();

create index if not exists idx_games_platform on public.games (platform);

-- แนวเกม (กรองหน้า /buy-games) — seed ตัวอย่าง
create table if not exists public.game_genres (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_en text not null,
  label_th text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_genres_sort on public.game_genres (sort_order);

insert into public.game_genres (slug, label_en, label_th, sort_order) values
  ('action', 'Action', 'แอ็กชัน', 10),
  ('adventure', 'Adventure', 'ผจญภัย', 20),
  ('rpg', 'RPG', 'สวมบทบาท', 30),
  ('strategy', 'Strategy', 'กลยุทธ์', 40),
  ('sports', 'Sports', 'กีฬา', 50),
  ('racing', 'Racing', 'แข่งรถ', 60),
  ('simulation', 'Simulation', 'จำลองสถานการณ์', 70),
  ('horror', 'Horror', 'สยองขวัญ', 80),
  ('puzzle', 'Puzzle', 'ปริศนา', 90),
  ('fps', 'FPS / Shooter', 'ยิงมุมบุคคลที่ 1', 100)
on conflict (slug) do nothing;

-- profiles: ขยายจาก auth.users (1:1)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'user',
  display_name text not null default '',
  updated_at timestamptz default now()
);

-- products: ตรงกับ api.ts / types Product
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  image_url text not null,
  gallery_urls text[] null,
  category public.product_category not null,
  type public.product_type not null,
  options numeric[] null,
  is_flash_sale boolean not null default false,
  is_bundle boolean not null default false,
  sales_count int not null default 0 check (sales_count >= 0),
  game_id uuid references public.games (id) on delete set null, -- null = หน้า /buy-games; มีค่า = สินค้าเติมเกมในหน้า /marketplace/:slug
  offer_kind public.offer_kind,
  account_platform public.product_category,
  genre_id uuid references public.game_genres (id) on delete set null,
  in_stock boolean not null default true,
  created_at timestamptz not null default now()
);

-- products เก่า: เติมคอลัมน์ก่อนสร้าง index บน game_id / genre_id / in_stock / account_platform
alter table public.products add column if not exists gallery_urls text[] null;
alter table public.products add column if not exists game_id uuid references public.games (id) on delete set null;
alter table public.products add column if not exists offer_kind public.offer_kind;
alter table public.products add column if not exists account_platform public.product_category;
alter table public.products add column if not exists genre_id uuid references public.game_genres (id) on delete set null;
alter table public.products add column if not exists in_stock boolean not null default true;

-- orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  total_price numeric(12, 2) not null check (total_price >= 0),
  status public.order_status not null default 'pending',
  payment_method public.payment_method not null,
  created_at timestamptz not null default now()
);

-- order line items (+ ฟิลด์สำหรับ topup ใน UI)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  player_id text,
  selected_option numeric,
  created_at timestamptz not null default now()
);

alter table public.order_items add column if not exists player_id text;
alter table public.order_items add column if not exists selected_option numeric;
alter table public.order_items add column if not exists created_at timestamptz not null default now();

-- messages (support / chat ตาม types)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- สร้างแถว profile อัตโนมัติเมื่อมี user ใหม่
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ตรวจ admin ใน RLS โดยไม่ subquery ตาราง profiles แบบตรง (กัน recursive policy 42P17)
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

-- ดัชนีที่ใช้บ่อย
create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_messages_user_id on public.messages (user_id);
create index if not exists idx_products_game_id on public.products (game_id);
create index if not exists idx_products_account_platform on public.products (account_platform) where category = 'account';
create index if not exists idx_products_genre_id on public.products (genre_id);
create index if not exists idx_products_in_stock on public.products (in_stock);

-- เปิด RLS แล้วตั้ง policy ตามต้องการ (ตัวอย่างเบื้องต้น — ปรับก่อน production)
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_genres enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.messages enable row level security;

-- RLS policies (drop ก่อนเพื่อรันซ้ำได้)
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "games_public_read" on public.games;
drop policy if exists "games_admin_all" on public.games;
drop policy if exists "game_genres_public_read" on public.game_genres;
drop policy if exists "game_genres_admin_all" on public.game_genres;
drop policy if exists "products_public_read" on public.products;
drop policy if exists "products_admin_write" on public.products;
drop policy if exists "orders_select_own" on public.orders;
drop policy if exists "orders_insert_own" on public.orders;
drop policy if exists "orders_delete_own" on public.orders;
drop policy if exists "order_items_select_own" on public.order_items;
drop policy if exists "order_items_insert_own" on public.order_items;
drop policy if exists "messages_select_own" on public.messages;
drop policy if exists "messages_insert_own" on public.messages;

-- profiles: อ่าน/แก้ของตัวเอง
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- games: อ่านเฉพาะที่เปิดใช้; แก้ไขเฉพาะ admin
create policy "games_public_read" on public.games for select using (is_active = true);
create policy "games_admin_all" on public.games for all using (public.is_admin()) with check (public.is_admin());

-- game_genres: อ่านเฉพาะที่เปิด; admin จัดการทั้งหมด
create policy "game_genres_public_read" on public.game_genres for select using (is_active = true);
create policy "game_genres_admin_all" on public.game_genres for all using (public.is_admin()) with check (public.is_admin());

-- products: อ่านได้ทุกคน; แก้ไขเฉพาะผู้ที่ profiles.role = 'admin'
create policy "products_public_read" on public.products for select using (true);
create policy "products_admin_write" on public.products for all using (public.is_admin()) with check (public.is_admin());

-- orders: เฉพาะเจ้าของ
create policy "orders_select_own" on public.orders for select using (auth.uid() = user_id);
create policy "orders_insert_own" on public.orders for insert with check (auth.uid() = user_id);
create policy "orders_delete_own" on public.orders for delete using (auth.uid() = user_id);

-- order_items: ผ่าน order ที่เป็นของ user
create policy "order_items_select_own" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy "order_items_insert_own" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

-- messages: อ่าน/เขียนของตัวเอง
create policy "messages_select_own" on public.messages for select using (auth.uid() = user_id);
create policy "messages_insert_own" on public.messages for insert with check (auth.uid() = user_id);

-- ตั้ง role เป็น admin: update public.profiles set role = 'admin' where id = '<user-uuid>';
-- หน้า Admin: รัน supabase/patch_admin_rls_and_settings.sql (หลัง patch_home_content.sql)
-- ถ้าเจอ error recursive policy บน profiles: รัน supabase/patch_rls_is_admin.sql
