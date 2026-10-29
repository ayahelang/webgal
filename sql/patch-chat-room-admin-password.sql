-- Admin boleh masuk ruang berpassword jika password benar (tanpa harus di tree peserta)
-- Jalankan di Supabase SQL Editor (opsional; client JS sudah menangani admin)

create or replace function public.verify_chat_room_access_v2(
  p_room_id uuid,
  p_password text default null,
  p_angkatan_id uuid default null,
  p_class_code text default null,
  p_student_name text default null,
  p_angkatan_year text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.gallery_chat_rooms%rowtype;
  cls text;
  nm text;
  is_admin boolean := false;
begin
  select * into r from public.gallery_chat_rooms where id = p_room_id and is_active = true;
  if not found then
    return false;
  end if;

  -- Password
  if r.access_password is not null and length(trim(r.access_password)) > 0 then
    if p_password is null or trim(p_password) <> trim(r.access_password) then
      return false;
    end if;
  end if;

  -- Admin (JWT email / role) lolos setelah password
  begin
    select exists (
      select 1 from public.gallery_profiles p
      where p.user_id = auth.uid() and coalesce(p.is_admin, false) = true
    ) into is_admin;
  exception when others then
    is_admin := false;
  end;
  if is_admin then
    return true;
  end if;

  -- Batasan angkatan
  if r.allowed_angkatan_ids is not null and coalesce(array_length(r.allowed_angkatan_ids, 1), 0) > 0 then
    if p_angkatan_id is null or not (p_angkatan_id = any (r.allowed_angkatan_ids)) then
      return false;
    end if;
  end if;

  -- Batasan kelas
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

  -- Batasan siswa (jsonb)
  if r.allowed_students is not null and jsonb_typeof(r.allowed_students) = 'array'
     and jsonb_array_length(r.allowed_students) > 0 then
    nm := lower(trim(coalesce(p_student_name, '')));
    if nm = '' then
      return false;
    end if;
    if not exists (
      select 1
      from jsonb_array_elements(r.allowed_students) s
      where lower(trim(coalesce(s->>'name', ''))) = nm
        and (
          coalesce(s->>'class', '') = ''
          or lower(trim(s->>'class')) = lower(trim(coalesce(p_class_code, '')))
        )
        and (
          coalesce(s->>'year', '') = ''
          or trim(s->>'year') = trim(coalesce(p_angkatan_year, ''))
        )
    ) then
      return false;
    end if;
  end if;

  return true;
end;
$$;

notify pgrst, 'reload schema';
