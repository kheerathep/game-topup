-- อัปโหลดรูปแคตตาล็อก → ได้ public URL ไปใส่ products.image_url, games.image_url, home_hero ฯลฯ
-- รันใน Supabase SQL Editor หลังมีตาราง public.profiles
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

insert into storage.buckets (id, name, public)
values ('catalog', 'catalog', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "catalog_read_public" on storage.objects;
drop policy if exists "catalog_insert_admin" on storage.objects;
drop policy if exists "catalog_update_admin" on storage.objects;
drop policy if exists "catalog_delete_admin" on storage.objects;

create policy "catalog_read_public"
  on storage.objects for select
  using (bucket_id = 'catalog');

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
