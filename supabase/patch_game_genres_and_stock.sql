-- แนวเกม + พร้อมขาย — รันใน Supabase SQL Editor หลัง schema หลัก
-- 1) ตาราง game_genres 2) products.genre_id 3) products.in_stock 4) RLS
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
create index if not exists idx_game_genres_active on public.game_genres (is_active) where is_active = true;

-- ตัวอย่างแนว (แก้/เพิ่มใน Dashboard ได้)
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

alter table public.products add column if not exists genre_id uuid references public.game_genres (id) on delete set null;
alter table public.products add column if not exists in_stock boolean not null default true;

create index if not exists idx_products_genre_id on public.products (genre_id);
create index if not exists idx_products_in_stock on public.products (in_stock);

comment on column public.products.genre_id is 'แนวเกม — กรองหน้า /buy-games';
comment on column public.products.in_stock is 'false = แสดงแต่ไม่ให้ใส่ตะกร้า / กรองพร้อมขาย';

alter table public.game_genres enable row level security;

drop policy if exists "game_genres_public_read" on public.game_genres;
create policy "game_genres_public_read" on public.game_genres
  for select using (is_active = true);

drop policy if exists "game_genres_admin_all" on public.game_genres;
create policy "game_genres_admin_all" on public.game_genres
  for all using (public.is_admin()) with check (public.is_admin());
