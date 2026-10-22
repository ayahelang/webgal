-- Seed alumni 2023 (filter IT / SI / Informatika / Bisnis Digital / Desain / Komunikasi~SMM)
-- Sumber: daftar alumni PTN/PTS Pesantren Modern At-Taqwa (2024)

insert into gallery_angkatan (label, label_norm, source)
values ('Angkatan 2023', 'angkatan 2023', 'admin')
on conflict (label_norm) do update set label = excluded.label;

do $$
declare
  ang uuid;
begin
  select id into ang from gallery_angkatan where label_norm = 'angkatan 2023' limit 1;
  if ang is null then
    insert into gallery_angkatan (label, label_norm, source) values ('Angkatan 2023', 'angkatan 2023', 'admin') returning id into ang;
  end if;

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Damia Salsabila', 'damia salsabila', ang, null, 'Universitas Gunadarma · Sistem Informasi', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Nilafaika', 'nilafaika', ang, null, 'Universitas Gunadarma · Sistem Informasi', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Neisya Aulia Ahmad', 'neisya aulia ahmad', ang, null, 'Universitas Terbuka · Sistem Informasi', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Artya Epriliani', 'artya epriliani', ang, null, 'Universitas Gunadarma · Sistem Informasi', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Pradhita Pameswari', 'pradhita pameswari', ang, null, 'Pertamina University · Ilmu Komputer', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Shafa Nabila', 'shafa nabila', ang, null, 'Institut Teknologi PLN · Informatika', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Wildah Nadzhifatu Syaiqoh', 'wildah nadzhifatu syaiqoh', ang, null, 'Universitas Pakuan · Bisnis Digital', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Eline Nuha', 'eline nuha', ang, null, 'Universitas Pendidikan Jakarta · Bisnis Digital', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Nazwa Azzahra', 'nazwa azzahra', ang, null, 'Universitas Paramadina · Desain Produk Lifestyle', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Dahayu Aqila', 'dahayu aqila', ang, null, 'Polimedia · Desain Mode', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Amelia S', 'amelia s', ang, null, 'Universitas Gunadarma · Ilmu Komunikasi', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Khaylila', 'khaylila', ang, null, 'Universitas Telkom · Ilmu Komunikasi', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

  insert into gallery_alumni (name, name_norm, angkatan_id, class_code, school, role)
  values ('Puja Azira Maharani', 'puja azira maharani', ang, null, 'Universitas Paramadina · Ilmu Komunikasi', 'Alumni')
  on conflict (name_norm, angkatan_id) do update set school = excluded.school, role = 'Alumni';

end $$;
