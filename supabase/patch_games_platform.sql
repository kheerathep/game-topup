-- แยกเกมตาม platform (ใช้ enum เดียวกับ product_category)
alter table public.games add column if not exists platform public.product_category not null default 'mobile';

create index if not exists idx_games_platform on public.games (platform);

comment on column public.games.platform is 'แพลตฟอร์มหลักของเกม — กรองในหน้า /marketplace?platform=';

update public.games set platform = 'mobile' where slug = 'mobile-legends-bang-bang';
