-- คำอธิบายเกมแยกภาษา (games) — รันหลังมีตาราง games
alter table public.games add column if not exists description_en text;
alter table public.games add column if not exists description_th text;

comment on column public.games.description is 'legacy: คำอธิบายเดิม — ใช้ description_en / description_th แทน';
comment on column public.games.description_en is 'คำอธิบายภาษาอังกฤษ';
comment on column public.games.description_th is 'คำอธิบายภาษาไทย';

-- ย้าย description เดิมไปทั้งสองคอลัมน์เมื่อยังว่าง (แก้แยกภาษาใน Table Editor ได้ภายหลัง)
update public.games
set
  description_en = case when coalesce(trim(description_en), '') = '' then description else description_en end,
  description_th = case when coalesce(trim(description_th), '') = '' then description else description_th end
where description is not null and trim(description) <> '';
