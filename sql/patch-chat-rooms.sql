-- Ruang chat custom (admin): nama, password opsional, batasan angkatan/kelas
create table if not exists gallery_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  access_password text default null,
  allowed_angkatan_ids uuid[] default '{}',
  allowed_class_codes text[] default '{}',
  is_active boolean not null default true,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  created_by text default ''
);

create index if not exists gallery_chat_rooms_active_idx
  on gallery_chat_rooms (is_active, sort_order, name);

alter table gallery_chat
  add column if not exists room_id uuid references gallery_chat_rooms(id) on delete set null;

create index if not exists gallery_chat_room_id_idx
  on gallery_chat (room_id, created_at desc);

alter table gallery_chat_rooms enable row level security;

drop policy if exists "chat_rooms read active" on gallery_chat_rooms;
create policy "chat_rooms read active" on gallery_chat_rooms
  for select using (true);

drop policy if exists "chat_rooms write auth" on gallery_chat_rooms;
create policy "chat_rooms write auth" on gallery_chat_rooms
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Verifikasi akses ruang (password + angkatan/kelas) — security definer
create or replace function public.verify_chat_room_access(
  p_room_id uuid,
  p_password text default null,
  p_angkatan_id uuid default null,
  p_class_code text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r gallery_chat_rooms%rowtype;
  cls text;
begin
  select * into r from gallery_chat_rooms where id = p_room_id and is_active = true;
  if not found then
    return false;
  end if;

  -- Password
  if r.access_password is not null and length(trim(r.access_password)) > 0 then
    if p_password is null or trim(p_password) <> trim(r.access_password) then
      return false;
    end if;
  end if;

  -- Batasan angkatan (uuid[])
  if r.allowed_angkatan_ids is not null and coalesce(array_length(r.allowed_angkatan_ids, 1), 0) > 0 then
    if p_angkatan_id is null or not (p_angkatan_id = any (r.allowed_angkatan_ids)) then
      return false;
    end if;
  end if;

  -- Batasan kelas (text[]), bandingkan case-insensitive
  if r.allowed_class_codes is not null and coalesce(array_length(r.allowed_class_codes, 1), 0) > 0 then
    cls := lower(trim(coalesce(p_class_code, '')));
    if cls = '' then
      return false;
    end if;
    if not exists (
      select 1 from unnest(r.allowed_class_codes) as c(code)
      where lower(trim(c.code)) = cls
    ) then
      return false;
    end if;
  end if;

  return true;
end;
$$;

grant execute on function public.verify_chat_room_access(uuid, text, uuid, text) to anon, authenticated;
