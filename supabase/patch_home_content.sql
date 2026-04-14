-- Home hero (แถวเดียว id=1) + แพลตฟอร์มหน้าแรก — รันใน Supabase SQL Editor หลัง schema หลัก
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

create table if not exists public.home_hero (
  id smallint primary key check (id = 1),
  eyebrow_en text not null default 'Seasonal Protocol',
  eyebrow_th text not null default 'Seasonal Protocol',
  headline_en text not null default 'Instant Power Up',
  headline_th text not null default 'เติมไว ทันใจ',
  subheadline_en text not null default 'Unlock legendary loot and rare items with up to 70% discount. The hunt begins now.',
  subheadline_th text not null default 'ปลดล็อกของหายากและไอเทมพิเศษ ลดสูงสุด 70% เริ่มล่าสมบัติได้เลย',
  image_url text not null,
  primary_label_en text not null default 'Hunt Deals',
  primary_label_th text not null default 'ล่าดีล',
  primary_href text not null default '/buy-games',
  secondary_label_en text not null default 'View Vault',
  secondary_label_th text not null default 'ดูคลัง',
  secondary_href text not null default '/marketplace',
  updated_at timestamptz not null default now()
);

create table if not exists public.home_platforms (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  icon_name text not null,
  label text not null,
  href text not null,
  is_active boolean not null default true,
  constraint home_platforms_label_unique unique (label)
);

alter table public.home_hero enable row level security;
alter table public.home_platforms enable row level security;

drop policy if exists "home_hero_public_read" on public.home_hero;
create policy "home_hero_public_read" on public.home_hero for select using (true);

drop policy if exists "home_platforms_public_read" on public.home_platforms;
create policy "home_platforms_public_read" on public.home_platforms for select using (is_active = true);

drop policy if exists "home_hero_admin_write" on public.home_hero;
create policy "home_hero_admin_write" on public.home_hero for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "home_platforms_admin_write" on public.home_platforms;
create policy "home_platforms_admin_write" on public.home_platforms for all using (public.is_admin()) with check (public.is_admin());

insert into public.home_hero (
  id,
  image_url,
  primary_href,
  secondary_href
) values (
  1,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBEIgak1ffcVVHaPWIgDpccvT-JqW2EGbHR-21eSmYBX96J_kKvgfb9DXoAXU88AJ6PUphh31m38xibKnFguDHK8ZXCYMg6Mij8dXuxX0vgQ4qu4PKQotMHcugvVyE3v_Ockj01OtmL__gS-OI12oIBBczYBVEwkgK6efdAzHRy1GgJzV9fTCCPLO5ekVxyP6oKJS8jBNTjPf_WmqVjQ1UPKw1bsIek64EKT6GGXTRSXaoLAdqGb6-NH-1o-H_Iw-XqaXgerGmAaonc',
  '/buy-games',
  '/marketplace'
)
on conflict (id) do nothing;

insert into public.home_platforms (sort_order, icon_name, label, href) values
  (0, 'computer', 'PC Gaming', '/marketplace?category=pc'),
  (1, 'videogame_asset', 'PlayStation', '/marketplace?category=playstation'),
  (2, 'sports_esports', 'Xbox One', '/marketplace?category=xbox'),
  (3, 'switch', 'Switch', '/marketplace?category=switch'),
  (4, 'smartphone', 'Mobile', '/marketplace?category=mobile')
on conflict (label) do nothing;
