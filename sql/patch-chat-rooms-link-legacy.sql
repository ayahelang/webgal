-- Tautkan ruang ke histori chat lama + pastikan ruang global ada
alter table public.gallery_chat_rooms
  add column if not exists source_angkatan_id uuid null;

insert into public.gallery_chat_rooms (name, description, is_active, sort_order, created_by)
select
  'Lintas angkatan (global)',
  'Ruang gabungan semua angkatan (histori global). legacy_global',
  true,
  0,
  'migrate-global'
where not exists (
  select 1 from public.gallery_chat_rooms r
  where lower(r.name) like '%global%'
     or lower(r.name) like '%lintas%'
);

update public.gallery_chat_rooms r
set source_angkatan_id = a.id,
    allowed_angkatan_ids = array[a.id]::uuid[]
from public.gallery_angkatan a
where r.source_angkatan_id is null
  and (
    (substring(a.label from '20[0-9]{2}') is not null
      and r.name ilike '%' || substring(a.label from '20[0-9]{2}') || '%')
    or lower(trim(r.name)) = lower(trim(a.label))
    or lower(trim(r.name)) = lower(trim(coalesce(a.label_norm, '')))
  );

select id, name, source_angkatan_id, allowed_angkatan_ids
from public.gallery_chat_rooms
order by sort_order, name;

notify pgrst, 'reload schema';
