-- ============================================================
-- Online pengunjung (login + browsing) — jalankan di SQL Editor
-- Supabase: satu kali tempel → Run. Tanpa klik menu Realtime.
-- ============================================================

-- 1) Tabel heartbeat online
create table if not exists public.gallery_online (
  session_id  text primary key,
  last_seen   timestamptz not null default now(),
  logged_in   boolean not null default false,
  user_id     uuid null,
  path        text null,
  user_agent  text null
);

create index if not exists gallery_online_last_seen_idx
  on public.gallery_online (last_seen desc);

-- 2) RLS: anon & authenticated boleh upsert + baca (hanya untuk hitung online)
alter table public.gallery_online enable row level security;

drop policy if exists gallery_online_select on public.gallery_online;
create policy gallery_online_select on public.gallery_online
  for select to anon, authenticated
  using (true);

drop policy if exists gallery_online_insert on public.gallery_online;
create policy gallery_online_insert on public.gallery_online
  for insert to anon, authenticated
  with check (true);

drop policy if exists gallery_online_update on public.gallery_online;
create policy gallery_online_update on public.gallery_online
  for update to anon, authenticated
  using (true) with check (true);

-- 3) Fungsi hitung yang masih "hidup" (default 45 detik)
create or replace function public.gallery_online_count(max_age_seconds int default 45)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.gallery_online
  where last_seen > now() - make_interval(secs => greatest(max_age_seconds, 15));
$$;

grant execute on function public.gallery_online_count(int) to anon, authenticated;

-- 4) Opsional: bersihkan baris lama (> 1 hari) — aman dijalankan kapan saja
delete from public.gallery_online
where last_seen < now() - interval '1 day';

-- 5) Pastikan Realtime publication punya gallery_events (untuk statistik lain)
--    Abaikan error jika sudah terdaftar.
do $$
begin
  begin
    alter publication supabase_realtime add table public.gallery_events;
  exception when duplicate_object then
    null;
  when others then
    -- publication mungkin tidak ada di lingkungan lokal
    raise notice 'skip realtime publication: %', sqlerrm;
  end;
end $$;

-- Cek cepat (harus return 0 atau angka):
-- select public.gallery_online_count(45);
