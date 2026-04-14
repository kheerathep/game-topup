-- แก้ error: infinite recursion detected in policy for relation "profiles" (42P17)
-- สาเหตุ: นโยบายที่ใช้ EXISTS (SELECT … FROM profiles …) ทำให้ตรวจ RLS ซ้ำบนตาราง profiles
-- วิธีแก้: ฟังก์ชัน SECURITY DEFINER อ่าน profiles โดยไม่ถูก RLS วนซ้ำ
--
-- รันไฟล์นี้ใน Supabase SQL Editor ครั้งเดียว (idempotent)

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

-- --- ตาราง public ---

drop policy if exists "games_admin_all" on public.games;
create policy "games_admin_all" on public.games for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "game_genres_admin_all" on public.game_genres;
create policy "game_genres_admin_all" on public.game_genres for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- home_hero / home_platforms (มีเมื่อรัน patch_home_content.sql)
do $do$
begin
  if to_regclass('public.home_hero') is not null then
    execute 'drop policy if exists "home_hero_admin_write" on public.home_hero';
    execute $p$
      create policy "home_hero_admin_write" on public.home_hero for all
        using (public.is_admin()) with check (public.is_admin())
    $p$;
  end if;
  if to_regclass('public.home_platforms') is not null then
    execute 'drop policy if exists "home_platforms_admin_write" on public.home_platforms';
    execute $p$
      create policy "home_platforms_admin_write" on public.home_platforms for all
        using (public.is_admin()) with check (public.is_admin())
    $p$;
  end if;
end
$do$;

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all" on public.profiles for select
  using (public.is_admin());

drop policy if exists "orders_admin_select" on public.orders;
create policy "orders_admin_select" on public.orders for select
  using (public.is_admin());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items_admin_select" on public.order_items;
create policy "order_items_admin_select" on public.order_items for select
  using (public.is_admin());

do $do$
begin
  if to_regclass('public.site_settings') is not null then
    execute 'drop policy if exists "site_settings_admin_write" on public.site_settings';
    execute $p$
      create policy "site_settings_admin_write" on public.site_settings for all
        using (public.is_admin()) with check (public.is_admin())
    $p$;
  end if;
end
$do$;

-- --- storage (ถ้ามี bucket catalog) ---

drop policy if exists "catalog_insert_admin" on storage.objects;
drop policy if exists "catalog_update_admin" on storage.objects;
drop policy if exists "catalog_delete_admin" on storage.objects;

create policy "catalog_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'catalog'
    and public.is_admin()
  );

create policy "catalog_update_admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'catalog'
    and public.is_admin()
  );

create policy "catalog_delete_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'catalog'
    and public.is_admin()
  );
