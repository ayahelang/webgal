-- Seed angkatan 2024 dari Google Sheet Sosmed 51/52
insert into gallery_angkatan(label, label_norm, source) values ('Angkatan 2024','angkatan-2024','system') on conflict (label_norm) do update set label=excluded.label;
do $$ declare aid uuid; alid uuid;
begin
  select id into aid from gallery_angkatan where label_norm='angkatan-2024' limit 1;
  -- Ahya Auliya
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Ahya Auliya','ahya-auliya',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='ahya-auliya' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Ahya Auliya · Domain','https://aebloxie.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Ahya Auliya · Video 1','https://youtu.be/aKpx2rTrS_c?si=B_931d3PwGEDZvcp','youtube','https://www.youtube.com/embed/aKpx2rTrS_c','Angkatan 2024 Kls 51','Ahya Auliya','sheet-import')
  ;
  -- Aisyah Nur Syifa
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Aisyah Nur Syifa','aisyah-nur-syifa',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='aisyah-nur-syifa' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Aisyah Nur Syifa · Domain','https://icecreaverse.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Aisyah Nur Syifa · Video 1','https://youtu.be/YY6wVCB8YRQ','youtube','https://www.youtube.com/embed/YY6wVCB8YRQ','Angkatan 2024 Kls 51','Aisyah Nur Syifa','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Aisyah Nur Syifa · Video 2','https://youtu.be/OfRfBJYT4s0','youtube','https://www.youtube.com/embed/OfRfBJYT4s0','Angkatan 2024 Kls 51','Aisyah Nur Syifa','sheet-import')
  ;
  -- Ananda Keisyha Farhan
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Ananda Keisyha Farhan','ananda-keisyha-farhan',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='ananda-keisyha-farhan' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Ananda Keisyha Farhan · Domain','https://flavorndsyha.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Ananda Keisyha Farhan · Video 1','https://youtu.be/WExFn6HlKtU','youtube','https://www.youtube.com/embed/WExFn6HlKtU','Angkatan 2024 Kls 51','Ananda Keisyha Farhan','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Ananda Keisyha Farhan · Video 2','https://youtu.be/CbEu8zgJjAA','youtube','https://www.youtube.com/embed/CbEu8zgJjAA','Angkatan 2024 Kls 51','Ananda Keisyha Farhan','sheet-import')
  ;
  -- Annisa Aprilia Khairani
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Annisa Aprilia Khairani','annisa-aprilia-khairani',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='annisa-aprilia-khairani' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Annisa Aprilia Khairani · Domain','https://jakartafood.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Annisa Aprilia Khairani · Video 1','https://youtu.be/jzKDn9Pm-tU','youtube','https://www.youtube.com/embed/jzKDn9Pm-tU','Angkatan 2024 Kls 51','Annisa Aprilia Khairani','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Annisa Aprilia Khairani · Video 2','https://youtu.be/CbEu8zgJjAA','youtube','https://www.youtube.com/embed/CbEu8zgJjAA','Angkatan 2024 Kls 51','Annisa Aprilia Khairani','sheet-import')
  ;
  -- Aqilah Al Khalifi
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Aqilah Al Khalifi','aqilah-al-khalifi',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='aqilah-al-khalifi' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Aqilah Al Khalifi · Domain','https://qiqila.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Aqilah Al Khalifi · Video 1','https://youtu.be/nXofejFxLbs?si=ZAYi8TGHFMRlzYpw','youtube','https://www.youtube.com/embed/nXofejFxLbs','Angkatan 2024 Kls 51','Aqilah Al Khalifi','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Aqilah Al Khalifi · Video 2','https://youtu.be/_YQ-DT923qw?si=bIxjUTeyp3ECMJVr','youtube','https://www.youtube.com/embed/_YQ-DT923qw','Angkatan 2024 Kls 51','Aqilah Al Khalifi','sheet-import')
  ;
  -- Aura Rifadya
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Aura Rifadya','aura-rifadya',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='aura-rifadya' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Aura Rifadya · Domain','https://adycozy.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Aura Rifadya · Video 1','https://youtu.be/NGbXduBuR18','youtube','https://www.youtube.com/embed/NGbXduBuR18','Angkatan 2024 Kls 51','Aura Rifadya','sheet-import')
  ;
  -- Chayara Alima R
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Chayara Alima R','chayara-alima-r',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='chayara-alima-r' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Chayara Alima R · Domain','https://koihaku.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Chayara Alima R · Video 1','https://youtu.be/2GRTtiyriF0?si=8ZzDwhhkAyqgITGD','youtube','https://www.youtube.com/embed/2GRTtiyriF0','Angkatan 2024 Kls 51','Chayara Alima R','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Chayara Alima R · Video 2','https://youtu.be/rwIh8de6PFw?si=gcoD6i7r3-q9Ov8z','youtube','https://www.youtube.com/embed/rwIh8de6PFw','Angkatan 2024 Kls 51','Chayara Alima R','sheet-import')
  ;
  -- Dafira Naila Nadhifa
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Dafira Naila Nadhifa','dafira-naila-nadhifa',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='dafira-naila-nadhifa' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Dafira Naila Nadhifa · Domain','https://firadigital.my.id','Domain','Dari sheet Sosmed 51')
  ;
  -- Firstyaningtyas Nur Alya Adriana
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Firstyaningtyas Nur Alya Adriana','firstyaningtyas-nur-alya-adriana',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='firstyaningtyas-nur-alya-adriana' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Firstyaningtyas Nur Alya Adriana · Domain','https://m0urnveil.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Firstyaningtyas Nur Alya Adriana · Video 1','https://youtu.be/E6XDgnFz46E','youtube','https://www.youtube.com/embed/E6XDgnFz46E','Angkatan 2024 Kls 51','Firstyaningtyas Nur Alya Adriana','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Firstyaningtyas Nur Alya Adriana · Video 2','https://youtu.be/fZ9R7qiwc3k','youtube','https://www.youtube.com/embed/fZ9R7qiwc3k','Angkatan 2024 Kls 51','Firstyaningtyas Nur Alya Adriana','sheet-import')
  ;
  -- Ghaisani Aurora
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Ghaisani Aurora','ghaisani-aurora',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='ghaisani-aurora' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Ghaisani Aurora · Domain','https://arorashop.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Ghaisani Aurora · Video 1','https://youtu.be/Pq9kkd8aAMM','youtube','https://www.youtube.com/embed/Pq9kkd8aAMM','Angkatan 2024 Kls 51','Ghaisani Aurora','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Ghaisani Aurora · Video 2','https://youtu.be/6hPFmxaJeaM','youtube','https://www.youtube.com/embed/6hPFmxaJeaM','Angkatan 2024 Kls 51','Ghaisani Aurora','sheet-import')
  ;
  -- Hanan Nur Hanifah ᯓ
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Hanan Nur Hanifah ᯓ','hanan-nur-hanifah',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='hanan-nur-hanifah' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Hanan Nur Hanifah ᯓ · Domain','https://nanora.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Hanan Nur Hanifah ᯓ · Video 1','https://youtu.be/m5oA0daV-Ns','youtube','https://www.youtube.com/embed/m5oA0daV-Ns','Angkatan 2024 Kls 51','Hanan Nur Hanifah ᯓ','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Hanan Nur Hanifah ᯓ · Video 2','https://youtu.be/hsuxRS9wuOA','youtube','https://www.youtube.com/embed/hsuxRS9wuOA','Angkatan 2024 Kls 51','Hanan Nur Hanifah ᯓ','sheet-import')
  ;
  -- Khansa Alkhumaira
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Khansa Alkhumaira','khansa-alkhumaira',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='khansa-alkhumaira' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Khansa Alkhumaira · Domain','https://elitedental.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Khansa Alkhumaira · Video 1','https://youtu.be/A5EwKBwur6s','youtube','https://www.youtube.com/embed/A5EwKBwur6s','Angkatan 2024 Kls 51','Khansa Alkhumaira','sheet-import')
  ;
  -- Maiasa Aulia Rahma
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Maiasa Aulia Rahma','maiasa-aulia-rahma',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='maiasa-aulia-rahma' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Maiasa Aulia Rahma · Domain','https://myraart.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Maiasa Aulia Rahma · Video 1','https://www.youtube.com/watch?v=JH8x3_gL-7g','youtube','https://www.youtube.com/embed/JH8x3_gL-7g','Angkatan 2024 Kls 51','Maiasa Aulia Rahma','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Maiasa Aulia Rahma · Video 2','https://www.youtube.com/watch?v=AGa1B7_KNgw','youtube','https://www.youtube.com/embed/AGa1B7_KNgw','Angkatan 2024 Kls 51','Maiasa Aulia Rahma','sheet-import')
  ;
  -- Nadhira Aquiny Pricillia Widodo
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Nadhira Aquiny Pricillia Widodo','nadhira-aquiny-pricillia-widodo',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='nadhira-aquiny-pricillia-widodo' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Nadhira Aquiny Pricillia Widodo · Domain','https://naaqueny.com','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Nadhira Aquiny Pricillia Widodo · Video 1','https://youtu.be/MUHX8lUCo-4','youtube','https://www.youtube.com/embed/MUHX8lUCo-4','Angkatan 2024 Kls 51','Nadhira Aquiny Pricillia Widodo','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Nadhira Aquiny Pricillia Widodo · Video 2','https://youtu.be/j1NqIof2LvI','youtube','https://www.youtube.com/embed/j1NqIof2LvI','Angkatan 2024 Kls 51','Nadhira Aquiny Pricillia Widodo','sheet-import')
  ;
  -- Nadifa Tazkiya
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Nadifa Tazkiya','nadifa-tazkiya',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='nadifa-tazkiya' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Nadifa Tazkiya · Domain','https://trendyfashion.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Nadifa Tazkiya · Video 1','https://youtu.be/DETEb1OJcMM','youtube','https://www.youtube.com/embed/DETEb1OJcMM','Angkatan 2024 Kls 51','Nadifa Tazkiya','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Nadifa Tazkiya · Video 2','https://youtu.be/sRphgremZn4','youtube','https://www.youtube.com/embed/sRphgremZn4','Angkatan 2024 Kls 51','Nadifa Tazkiya','sheet-import')
  ;
  -- Nafisha Ramadhani Afdal
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Nafisha Ramadhani Afdal','nafisha-ramadhani-afdal',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='nafisha-ramadhani-afdal' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Nafisha Ramadhani Afdal · Domain','https://udacosmetik.my.id/gallery','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Nafisha Ramadhani Afdal · Video 1','https://www.youtube.com/watch?v=2yeOlhsi_ow','youtube','https://www.youtube.com/embed/2yeOlhsi_ow','Angkatan 2024 Kls 51','Nafisha Ramadhani Afdal','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Nafisha Ramadhani Afdal · Video 2','https://www.youtube.com/watch?v=rU575q213Tw','youtube','https://www.youtube.com/embed/rU575q213Tw','Angkatan 2024 Kls 51','Nafisha Ramadhani Afdal','sheet-import')
  ;
  -- Nazla Jahrotul Umami oゞ
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Nazla Jahrotul Umami oゞ','nazla-jahrotul-umami-o',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='nazla-jahrotul-umami-o' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Nazla Jahrotul Umami oゞ · Domain','https://aitorunoct.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Nazla Jahrotul Umami oゞ · Video 2','https://youtu.be/D1kCKKhtKao','youtube','https://www.youtube.com/embed/D1kCKKhtKao','Angkatan 2024 Kls 51','Nazla Jahrotul Umami oゞ','sheet-import')
  ;
  -- Nazla Rahma Mahrul ramadhani
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Nazla Rahma Mahrul ramadhani','nazla-rahma-mahrul-ramadhani',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='nazla-rahma-mahrul-ramadhani' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Nazla Rahma Mahrul ramadhani · Domain','https://softbynazla.my.id','Domain','Dari sheet Sosmed 51')
  ;
  -- Nisa Azki Zafira
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Nisa Azki Zafira','nisa-azki-zafira',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='nisa-azki-zafira' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Nisa Azki Zafira · Domain','https://azkiverse.my.id/minumansegerrr','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Nisa Azki Zafira · Video 1','https://youtu.be/p68WbLow5OM','youtube','https://www.youtube.com/embed/p68WbLow5OM','Angkatan 2024 Kls 51','Nisa Azki Zafira','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Nisa Azki Zafira · Video 2','https://youtu.be/4fBSWfk7iWM','youtube','https://www.youtube.com/embed/4fBSWfk7iWM','Angkatan 2024 Kls 51','Nisa Azki Zafira','sheet-import')
  ;
  -- Nisrina Willa Oktariyani
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Nisrina Willa Oktariyani','nisrina-willa-oktariyani',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='nisrina-willa-oktariyani' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Nisrina Willa Oktariyani · Domain','https://beautiq.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Nisrina Willa Oktariyani · Video 1','https://youtu.be/nZTaoQyvjD0','youtube','https://www.youtube.com/embed/nZTaoQyvjD0','Angkatan 2024 Kls 51','Nisrina Willa Oktariyani','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Nisrina Willa Oktariyani · Video 2','https://youtu.be/Mq8mhOoW6vE','youtube','https://www.youtube.com/embed/Mq8mhOoW6vE','Angkatan 2024 Kls 51','Nisrina Willa Oktariyani','sheet-import')
  ;
  -- Queena Sava Az-Zahra ʚɞ
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Queena Sava Az-Zahra ʚɞ','queena-sava-az-zahra',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='queena-sava-az-zahra' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Queena Sava Az-Zahra ʚɞ · Domain','https://rosesunshine.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Queena Sava Az-Zahra ʚɞ · Video 1','https://youtu.be/A-tNGWvkcHM','youtube','https://www.youtube.com/embed/A-tNGWvkcHM','Angkatan 2024 Kls 51','Queena Sava Az-Zahra ʚɞ','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Queena Sava Az-Zahra ʚɞ · Video 2','https://youtu.be/8eg6saUqFlU','youtube','https://www.youtube.com/embed/8eg6saUqFlU','Angkatan 2024 Kls 51','Queena Sava Az-Zahra ʚɞ','sheet-import')
  ;
  -- Rifqa Alifia Nurmadina
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Rifqa Alifia Nurmadina','rifqa-alifia-nurmadina',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='rifqa-alifia-nurmadina' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Rifqa Alifia Nurmadina · Domain','https://Qapture.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Rifqa Alifia Nurmadina · Video 2','https://youtu.be/q9TqBYcOYog','youtube','https://www.youtube.com/embed/q9TqBYcOYog','Angkatan 2024 Kls 51','Rifqa Alifia Nurmadina','sheet-import')
  ;
  -- Sila Amanda Putri
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Sila Amanda Putri','sila-amanda-putri',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='sila-amanda-putri' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Sila Amanda Putri · Domain','https://moonsila.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Sila Amanda Putri · Video 1','https://www.youtube.com/watch?v=1TMGjAWaZHo','youtube','https://www.youtube.com/embed/1TMGjAWaZHo','Angkatan 2024 Kls 51','Sila Amanda Putri','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Sila Amanda Putri · Video 2','https://www.youtube.com/watch?v=qiArBb1FpDM&list=TLPQMDgwNDIwMjY-_7fszwq_-A&index=3','youtube','https://www.youtube.com/embed/qiArBb1FpDM','Angkatan 2024 Kls 51','Sila Amanda Putri','sheet-import')
  ;
  -- siti dea armanda
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('siti dea armanda','siti-dea-armanda',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='siti-dea-armanda' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'siti dea armanda · Domain','https://dyboutique.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('siti dea armanda · Video 1','https://youtu.be/nKN4QTokHFs','youtube','https://www.youtube.com/embed/nKN4QTokHFs','Angkatan 2024 Kls 51','siti dea armanda','sheet-import')
  ;
  -- Siti Kaleyana m.saleh muslim
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Siti Kaleyana m.saleh muslim','siti-kaleyana-m-saleh-muslim',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='siti-kaleyana-m-saleh-muslim' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Siti Kaleyana m.saleh muslim · Domain','https://mycafes.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Siti Kaleyana m.saleh muslim · Video 1','https://youtu.be/z9EsobirqC8','youtube','https://www.youtube.com/embed/z9EsobirqC8','Angkatan 2024 Kls 51','Siti Kaleyana m.saleh muslim','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Siti Kaleyana m.saleh muslim · Video 2','https://youtube.com/shorts/3VLsVH0u6Yg','youtube','https://www.youtube.com/embed/3VLsVH0u6Yg','Angkatan 2024 Kls 51','Siti Kaleyana m.saleh muslim','sheet-import')
  ;
  -- Siti Zahra
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Siti Zahra','siti-zahra',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='siti-zahra' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Siti Zahra · Domain','https://keonor.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Siti Zahra · Video 1','https://youtu.be/jydKXVJXYX8','youtube','https://www.youtube.com/embed/jydKXVJXYX8','Angkatan 2024 Kls 51','Siti Zahra','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Siti Zahra · Video 2','https://youtu.be/9uu30KWafZI','youtube','https://www.youtube.com/embed/9uu30KWafZI','Angkatan 2024 Kls 51','Siti Zahra','sheet-import')
  ;
  -- Talitha Raissa Ramadhani
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Talitha Raissa Ramadhani','talitha-raissa-ramadhani',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='talitha-raissa-ramadhani' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Talitha Raissa Ramadhani · Domain','https://bwbytal.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Talitha Raissa Ramadhani · Video 1','https://youtu.be/PRqZW2Dfgxg','youtube','https://www.youtube.com/embed/PRqZW2Dfgxg','Angkatan 2024 Kls 51','Talitha Raissa Ramadhani','sheet-import')
  ;
  -- Wardah Nur Zahirah
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Wardah Nur Zahirah','wardah-nur-zahirah',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='wardah-nur-zahirah' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Wardah Nur Zahirah · Domain','https://zahirahcouture.my.id','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Wardah Nur Zahirah · Video 1','https://www.youtube.com/watch?v=b0NU3GgW5M4','youtube','https://www.youtube.com/embed/b0NU3GgW5M4','Angkatan 2024 Kls 51','Wardah Nur Zahirah','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Wardah Nur Zahirah · Video 2','https://youtu.be/kiMjNlBh5YI','youtube','https://www.youtube.com/embed/kiMjNlBh5YI','Angkatan 2024 Kls 51','Wardah Nur Zahirah','sheet-import')
  ;
  -- Zahira Syahda
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Zahira Syahda','zahira-syahda',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='zahira-syahda' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Zahira Syahda · Domain','https://bitesy.site','Domain','Dari sheet Sosmed 51')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Zahira Syahda · Video 1','https://youtu.be/HJqL8EZkWjA','youtube','https://www.youtube.com/embed/HJqL8EZkWjA','Angkatan 2024 Kls 51','Zahira Syahda','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Zahira Syahda · Video 2','https://youtu.be/ofFv3oW3Pog?si=FXnvZ4OsNEGq78yT','youtube','https://www.youtube.com/embed/ofFv3oW3Pog','Angkatan 2024 Kls 51','Zahira Syahda','sheet-import')
  ;
  -- Aira Zaimatunnisa Al-hidayat
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Aira Zaimatunnisa Al-hidayat','aira-zaimatunnisa-al-hidayat',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='aira-zaimatunnisa-al-hidayat' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Aira Zaimatunnisa Al-hidayat · Domain','https://zailume.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Aira Zaimatunnisa Al-hidayat · Video 1','https://youtu.be/CNG_9WdlqZ8','youtube','https://www.youtube.com/embed/CNG_9WdlqZ8','Angkatan 2024 Kls 52','Aira Zaimatunnisa Al-hidayat','sheet-import')
  ;
  -- Anisha Fadilla Ramadhani
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Anisha Fadilla Ramadhani','anisha-fadilla-ramadhani',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='anisha-fadilla-ramadhani' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Anisha Fadilla Ramadhani · Domain','https://darulnish.my.id','Domain','Dari sheet Sosmed 52')
  ;
  -- Aura zeta azkia
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Aura zeta azkia','aura-zeta-azkia',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='aura-zeta-azkia' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Aura zeta azkia · Domain','https://zettagirl.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Aura zeta azkia · Video 1','https://youtu.be/HaG1x3kZZNQ','youtube','https://www.youtube.com/embed/HaG1x3kZZNQ','Angkatan 2024 Kls 52','Aura zeta azkia','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Aura zeta azkia · Video 2','https://youtu.be/icqJFzLv7fI?si=lV2vzU2Ej-wtYc5T','youtube','https://www.youtube.com/embed/icqJFzLv7fI','Angkatan 2024 Kls 52','Aura zeta azkia','sheet-import')
  ;
  -- Azka Sahla Hanum
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Azka Sahla Hanum','azka-sahla-hanum',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='azka-sahla-hanum' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Azka Sahla Hanum · Domain','https://maison.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Azka Sahla Hanum · Video 1','https://youtu.be/3V374uuLDrE','youtube','https://www.youtube.com/embed/3V374uuLDrE','Angkatan 2024 Kls 52','Azka Sahla Hanum','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Azka Sahla Hanum · Video 2','https://www.youtube.com/@azkashx','youtube','https://www.youtube.com/@azkashx','Angkatan 2024 Kls 52','Azka Sahla Hanum','sheet-import')
  ;
  -- Balqis Alilah
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Balqis Alilah','balqis-alilah',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='balqis-alilah' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Balqis Alilah · Domain','https://sweetlayers.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Balqis Alilah · Video 2','https://youtu.be/-d__-gx20u8','youtube','https://www.youtube.com/embed/-d__-gx20u8','Angkatan 2024 Kls 52','Balqis Alilah','sheet-import')
  ;
  -- Chaisa Fitriah
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Chaisa Fitriah','chaisa-fitriah',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='chaisa-fitriah' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Chaisa Fitriah · Domain','https://cuteminniecha.my.id','Domain','Dari sheet Sosmed 52')
  ;
  -- Chelsea Prisillia Putri
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Chelsea Prisillia Putri','chelsea-prisillia-putri',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='chelsea-prisillia-putri' and angkatan_id=aid; end if;
  -- Deswita Aristaputri Khoirunisa
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Deswita Aristaputri Khoirunisa','deswita-aristaputri-khoirunisa',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='deswita-aristaputri-khoirunisa' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Deswita Aristaputri Khoirunisa · Domain','https://cadby.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Deswita Aristaputri Khoirunisa · Video 1','https://youtu.be/Gg0yi-EW0E0?si=VMJeWH7ky-BHRJ3E','youtube','https://www.youtube.com/embed/Gg0yi-EW0E0','Angkatan 2024 Kls 52','Deswita Aristaputri Khoirunisa','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Deswita Aristaputri Khoirunisa · Video 2','https://youtu.be/G_v9k9oSt88?si=_Q1WaKOlRVSlvZ46','youtube','https://www.youtube.com/embed/G_v9k9oSt88','Angkatan 2024 Kls 52','Deswita Aristaputri Khoirunisa','sheet-import')
  ;
  -- Diny Aminarti
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Diny Aminarti','diny-aminarti',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='diny-aminarti' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Diny Aminarti · Domain','https://bumirasa.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Diny Aminarti · Video 1','https://youtu.be/stgo94rm9m4','youtube','https://www.youtube.com/embed/stgo94rm9m4','Angkatan 2024 Kls 52','Diny Aminarti','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Diny Aminarti · Video 2','https://youtu.be/L7aX7q0wj8Q','youtube','https://www.youtube.com/embed/L7aX7q0wj8Q','Angkatan 2024 Kls 52','Diny Aminarti','sheet-import')
  ;
  -- Fawwazah sakhi maheswari
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Fawwazah sakhi maheswari','fawwazah-sakhi-maheswari',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='fawwazah-sakhi-maheswari' and angkatan_id=aid; end if;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Fawwazah sakhi maheswari · Video 1','https://youtu.be/jMN7w_LZ5sc','youtube','https://www.youtube.com/embed/jMN7w_LZ5sc','Angkatan 2024 Kls 52','Fawwazah sakhi maheswari','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Fawwazah sakhi maheswari · Video 2','https://youtu.be/KrqMUWH9KPI','youtube','https://www.youtube.com/embed/KrqMUWH9KPI','Angkatan 2024 Kls 52','Fawwazah sakhi maheswari','sheet-import')
  ;
  -- Firyal Naqiyyah El-Ridwan
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Firyal Naqiyyah El-Ridwan','firyal-naqiyyah-el-ridwan',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='firyal-naqiyyah-el-ridwan' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Firyal Naqiyyah El-Ridwan · Domain','https://iyaljournal.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Firyal Naqiyyah El-Ridwan · Video 1','https://youtu.be/NF7vVDqcccw?si=U-aW5u67qdw44TmI','youtube','https://www.youtube.com/embed/NF7vVDqcccw','Angkatan 2024 Kls 52','Firyal Naqiyyah El-Ridwan','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Firyal Naqiyyah El-Ridwan · Video 2','https://youtu.be/qTbHONMCMhI?si=NyFAiHgQEOIxczeC','youtube','https://www.youtube.com/embed/qTbHONMCMhI','Angkatan 2024 Kls 52','Firyal Naqiyyah El-Ridwan','sheet-import')
  ;
  -- Fitriyah Nadifah
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Fitriyah Nadifah','fitriyah-nadifah',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='fitriyah-nadifah' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Fitriyah Nadifah · Domain','https://dlifora.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Fitriyah Nadifah · Video 1','https://youtu.be/e6jFxb9zVDE','youtube','https://www.youtube.com/embed/e6jFxb9zVDE','Angkatan 2024 Kls 52','Fitriyah Nadifah','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Fitriyah Nadifah · Video 2','https://www.youtube.com/watch?v=POY3_1Vyz7Q','youtube','https://www.youtube.com/embed/POY3_1Vyz7Q','Angkatan 2024 Kls 52','Fitriyah Nadifah','sheet-import')
  ;
  -- Hilda Dihyan Calysta
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Hilda Dihyan Calysta','hilda-dihyan-calysta',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='hilda-dihyan-calysta' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Hilda Dihyan Calysta · Domain','https://hizel.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Hilda Dihyan Calysta · Video 1','https://youtu.be/geDu-54BlPw','youtube','https://www.youtube.com/embed/geDu-54BlPw','Angkatan 2024 Kls 52','Hilda Dihyan Calysta','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Hilda Dihyan Calysta · Video 2','https://youtu.be/sGg_TDl_5Lw','youtube','https://www.youtube.com/embed/sGg_TDl_5Lw','Angkatan 2024 Kls 52','Hilda Dihyan Calysta','sheet-import')
  ;
  -- Jemalia Khairany
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Jemalia Khairany','jemalia-khairany',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='jemalia-khairany' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Jemalia Khairany · Domain','http://savorelle.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Jemalia Khairany · Video 1','https://www.youtube.com/watch?v=6YGMrCcpS3Y','youtube','https://www.youtube.com/embed/6YGMrCcpS3Y','Angkatan 2024 Kls 52','Jemalia Khairany','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Jemalia Khairany · Video 2','https://www.youtube.com/watch?v=Jhfy1XXNCeQ','youtube','https://www.youtube.com/embed/Jhfy1XXNCeQ','Angkatan 2024 Kls 52','Jemalia Khairany','sheet-import')
  ;
  -- Keishara Amaraesya Zalfa
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Keishara Amaraesya Zalfa','keishara-amaraesya-zalfa',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='keishara-amaraesya-zalfa' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Keishara Amaraesya Zalfa · Domain','http://kaefyne.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Keishara Amaraesya Zalfa · Video 1','https://youtu.be/k4Drwi97o0g','youtube','https://www.youtube.com/embed/k4Drwi97o0g','Angkatan 2024 Kls 52','Keishara Amaraesya Zalfa','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Keishara Amaraesya Zalfa · Video 2','https://youtu.be/Lrmhbk1UCFs','youtube','https://www.youtube.com/embed/Lrmhbk1UCFs','Angkatan 2024 Kls 52','Keishara Amaraesya Zalfa','sheet-import')
  ;
  -- Keisya Putri Fazaria
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Keisya Putri Fazaria','keisya-putri-fazaria',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='keisya-putri-fazaria' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Keisya Putri Fazaria · Domain','https://kpfserenity.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Keisya Putri Fazaria · Video 1','https://www.youtube.com/watch?v=5qjkyBwDf6g','youtube','https://www.youtube.com/embed/5qjkyBwDf6g','Angkatan 2024 Kls 52','Keisya Putri Fazaria','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Keisya Putri Fazaria · Video 2','https://www.youtube.com/watch?v=MZxFFhWz-7c','youtube','https://www.youtube.com/embed/MZxFFhWz-7c','Angkatan 2024 Kls 52','Keisya Putri Fazaria','sheet-import')
  ;
  -- Keyra Aisyah Arafat
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Keyra Aisyah Arafat','keyra-aisyah-arafat',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='keyra-aisyah-arafat' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Keyra Aisyah Arafat · Domain','https://loudermagic.biz.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Keyra Aisyah Arafat · Video 1','https://youtu.be/ra6-Bc_YOiY','youtube','https://www.youtube.com/embed/ra6-Bc_YOiY','Angkatan 2024 Kls 52','Keyra Aisyah Arafat','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Keyra Aisyah Arafat · Video 2','https://youtu.be/-JiR1HREnl8','youtube','https://www.youtube.com/embed/-JiR1HREnl8','Angkatan 2024 Kls 52','Keyra Aisyah Arafat','sheet-import')
  ;
  -- Mozza Rayhanna Taqwa
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Mozza Rayhanna Taqwa','mozza-rayhanna-taqwa',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='mozza-rayhanna-taqwa' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Mozza Rayhanna Taqwa · Domain','https://isrealfood.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Mozza Rayhanna Taqwa · Video 1','https://youtu.be/G03Vd0h1Wdc','youtube','https://www.youtube.com/embed/G03Vd0h1Wdc','Angkatan 2024 Kls 52','Mozza Rayhanna Taqwa','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Mozza Rayhanna Taqwa · Video 2','https://youtu.be/fX2vSTrjZv8','youtube','https://www.youtube.com/embed/fX2vSTrjZv8','Angkatan 2024 Kls 52','Mozza Rayhanna Taqwa','sheet-import')
  ;
  -- Naifa Ghaisani
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Naifa Ghaisani','naifa-ghaisani',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='naifa-ghaisani' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Naifa Ghaisani · Domain','https://naifaflorist.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Naifa Ghaisani · Video 1','https://youtu.be/C-FSFa66aEw','youtube','https://www.youtube.com/embed/C-FSFa66aEw','Angkatan 2024 Kls 52','Naifa Ghaisani','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Naifa Ghaisani · Video 2','https://youtu.be/quToXsewpW8','youtube','https://www.youtube.com/embed/quToXsewpW8','Angkatan 2024 Kls 52','Naifa Ghaisani','sheet-import')
  ;
  -- Naira Sancyah Putri
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Naira Sancyah Putri','naira-sancyah-putri',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='naira-sancyah-putri' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Naira Sancyah Putri · Domain','https://hijrahstor.my.id','Domain','Dari sheet Sosmed 52')
  ;
  -- Nazhifa Wardah Azizah
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Nazhifa Wardah Azizah','nazhifa-wardah-azizah',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='nazhifa-wardah-azizah' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Nazhifa Wardah Azizah · Domain','https://zhyva.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Nazhifa Wardah Azizah · Video 1','https://youtu.be/5TEliQOMVMM','youtube','https://www.youtube.com/embed/5TEliQOMVMM','Angkatan 2024 Kls 52','Nazhifa Wardah Azizah','sheet-import')
  ;
  -- Nismah Faruk Zaini
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Nismah Faruk Zaini','nismah-faruk-zaini',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='nismah-faruk-zaini' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Nismah Faruk Zaini · Domain','https://bloomscent.my.id','Domain','Dari sheet Sosmed 52')
  ;
  -- Queensha Azzahra Hibatullah
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Queensha Azzahra Hibatullah','queensha-azzahra-hibatullah',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='queensha-azzahra-hibatullah' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Queensha Azzahra Hibatullah · Domain','https://shauenly.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Queensha Azzahra Hibatullah · Video 1','https://youtu.be/5uPxXZG6mt0','youtube','https://www.youtube.com/embed/5uPxXZG6mt0','Angkatan 2024 Kls 52','Queensha Azzahra Hibatullah','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Queensha Azzahra Hibatullah · Video 2','https://youtu.be/XivQDqyBWM8?si=yCY6k49T5uy586i_','youtube','https://www.youtube.com/embed/XivQDqyBWM8','Angkatan 2024 Kls 52','Queensha Azzahra Hibatullah','sheet-import')
  ;
  -- Rogwan Soraya
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Rogwan Soraya','rogwan-soraya',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='rogwan-soraya' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Rogwan Soraya · Domain','https://SoraOrbit.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Rogwan Soraya · Video 1','https://youtu.be/Gy4KnWu7JFM?si=BEkiD7sAxYNPK4D1','youtube','https://www.youtube.com/embed/Gy4KnWu7JFM','Angkatan 2024 Kls 52','Rogwan Soraya','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Rogwan Soraya · Video 2','https://youtu.be/E7-USA8y-j8?si=4GuGQUlYsn5GsJqV','youtube','https://www.youtube.com/embed/E7-USA8y-j8','Angkatan 2024 Kls 52','Rogwan Soraya','sheet-import')
  ;
  -- Rufaida Hawa Syafiyya
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Rufaida Hawa Syafiyya','rufaida-hawa-syafiyya',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='rufaida-hawa-syafiyya' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Rufaida Hawa Syafiyya · Domain','https://heyruf.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Rufaida Hawa Syafiyya · Video 1','https://www.youtube.com/watch?v=xtkak385C4g','youtube','https://www.youtube.com/embed/xtkak385C4g','Angkatan 2024 Kls 52','Rufaida Hawa Syafiyya','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Rufaida Hawa Syafiyya · Video 2','https://www.youtube.com/watch?v=5uU4vHt34k0','youtube','https://www.youtube.com/embed/5uU4vHt34k0','Angkatan 2024 Kls 52','Rufaida Hawa Syafiyya','sheet-import')
  ;
  -- Sahirah Hasanah
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Sahirah Hasanah','sahirah-hasanah',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='sahirah-hasanah' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Sahirah Hasanah · Domain','https://monneur.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Sahirah Hasanah · Video 1','https://youtu.be/05M4EbfAlRY','youtube','https://www.youtube.com/embed/05M4EbfAlRY','Angkatan 2024 Kls 52','Sahirah Hasanah','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Sahirah Hasanah · Video 2','https://youtu.be/OFcGCGB4pjc','youtube','https://www.youtube.com/embed/OFcGCGB4pjc','Angkatan 2024 Kls 52','Sahirah Hasanah','sheet-import')
  ;
  -- Salsabila Qurota'ayun
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Salsabila Qurota''ayun','salsabila-qurota-ayun',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='salsabila-qurota-ayun' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Salsabila Qurota''ayun · Domain','https://salltiens.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Salsabila Qurota''ayun · Video 1','https://youtu.be/qT7Y_Kt-He0?si=VxfQZdFmG7yD35uv','youtube','https://www.youtube.com/embed/qT7Y_Kt-He0','Angkatan 2024 Kls 52','Salsabila Qurota''ayun','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Salsabila Qurota''ayun · Video 2','https://youtu.be/kY9ZTwIi_Hss','youtube','https://www.youtube.com/embed/kY9ZTwIi_Hss','Angkatan 2024 Kls 52','Salsabila Qurota''ayun','sheet-import')
  ;
  -- Silvia Triandhini
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Silvia Triandhini','silvia-triandhini',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='silvia-triandhini' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Silvia Triandhini · Domain','https://yeppeojissun.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Silvia Triandhini · Video 1','https://youtu.be/py7SSKqZ1IY','youtube','https://www.youtube.com/embed/py7SSKqZ1IY','Angkatan 2024 Kls 52','Silvia Triandhini','sheet-import')
  ;
  -- Tarissa noerista lestady
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Tarissa noerista lestady','tarissa-noerista-lestady',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='tarissa-noerista-lestady' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Tarissa noerista lestady · Domain','https://runx.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Tarissa noerista lestady · Video 1','https://youtu.be/oV0kzBIChVg','youtube','https://www.youtube.com/embed/oV0kzBIChVg','Angkatan 2024 Kls 52','Tarissa noerista lestady','sheet-import')
  ;
  -- Zsazsa Azalia Ar-ramadhani
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role)
  values ('Zsazsa Azalia Ar-ramadhani','zsazsa-azalia-ar-ramadhani',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code
  returning id into alid;
  if alid is null then select id into alid from gallery_alumni where name_norm='zsazsa-azalia-ar-ramadhani' and angkatan_id=aid; end if;
  insert into gallery_websites(alumni_id,title,url,category,description)
  values (alid,'Zsazsa Azalia Ar-ramadhani · Domain','https://zsavora.my.id','Domain','Dari sheet Sosmed 52')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Zsazsa Azalia Ar-ramadhani · Video 1','https://youtu.be/jnzTDZ-Su1I','youtube','https://www.youtube.com/embed/jnzTDZ-Su1I','Angkatan 2024 Kls 52','Zsazsa Azalia Ar-ramadhani','sheet-import')
  ;
  insert into gallery_videos(title,url,platform,embed_url,description,owner_name,created_by)
  values ('Zsazsa Azalia Ar-ramadhani · Video 2','https://youtu.be/lZB_y56oQRk','youtube','https://www.youtube.com/embed/lZB_y56oQRk','Angkatan 2024 Kls 52','Zsazsa Azalia Ar-ramadhani','sheet-import')
  ;
end $$;