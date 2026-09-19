-- GitHub Pages links scanned from student accounts (Sosmed 51/52 sheet)
do $$ declare aid uuid; alid uuid;
begin
  select id into aid from gallery_angkatan where label_norm='angkatan-2024' limit 1;
  if aid is null then
    insert into gallery_angkatan(label,label_norm,source) values ('Angkatan 2024','angkatan-2024','system') returning id into aid;
  end if;
  -- Aqilah Al Khalifi (3 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Aqilah Al Khalifi','aqilah-al-khalifi',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='aqilah-al-khalifi' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aqilahalkhalifi27-dotcom.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Aqilah Al Khalifi · Site','https://aqilahalkhalifi27-dotcom.github.io','GitHub Pages','Repo: aqilahalkhalifi27-dotcom.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aqilahalkhalifi27-dotcom.github.io/khafcoff')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'khafcoff','https://aqilahalkhalifi27-dotcom.github.io/khafcoff','GitHub Pages','Repo: khafcoff');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aqilahalkhalifi27-dotcom.github.io/testoftea')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'testoftea','https://aqilahalkhalifi27-dotcom.github.io/testoftea','GitHub Pages','Repo: testoftea');
  end if;
  -- Ahya Auliya (3 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Ahya Auliya','ahya-auliya',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='ahya-auliya' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ahyaauliya75-gif.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Ahya Auliya · Site','https://ahyaauliya75-gif.github.io','GitHub Pages','Repo: ahyaauliya75-gif.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ahyaauliya75-gif.github.io/coffeecoffee')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'coffeecoffee','https://ahyaauliya75-gif.github.io/coffeecoffee','GitHub Pages','Repo: coffeecoffee');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ahyaauliya75-gif.github.io/broadcast')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'broadcast','https://ahyaauliya75-gif.github.io/broadcast','GitHub Pages','Repo: broadcast');
  end if;
  -- Ananda Keisyha Farhan (4 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Ananda Keisyha Farhan','ananda-keisyha-farhan',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='ananda-keisyha-farhan' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://anandakeisyha50-hub.github.io/cleaningservices')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'cleaningservices','https://anandakeisyha50-hub.github.io/cleaningservices','GitHub Pages','Repo: cleaningservices');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://anandakeisyha50-hub.github.io/delfood')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'delfood','https://anandakeisyha50-hub.github.io/delfood','GitHub Pages','Repo: delfood');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://anandakeisyha50-hub.github.io/coffee')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'coffee','https://anandakeisyha50-hub.github.io/coffee','GitHub Pages','Repo: coffee');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://anandakeisyha50-hub.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Ananda Keisyha Farhan · Site','https://anandakeisyha50-hub.github.io','GitHub Pages','Repo: anandakeisyha50-hub.github.io');
  end if;
  -- Aura Rifadya (3 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Aura Rifadya','aura-rifadya',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='aura-rifadya' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aurarifadya.github.io/kuliner')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'kuliner','https://aurarifadya.github.io/kuliner','GitHub Pages','Repo: kuliner');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aurarifadya.github.io/index.html')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'index.html','https://aurarifadya.github.io/index.html','GitHub Pages','Repo: index.html');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aurarifadya.github.io/adyaaa')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'adyaaa','https://aurarifadya.github.io/adyaaa','GitHub Pages','Repo: adyaaa');
  end if;
  -- Annisa Aprilia Khairani (7 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Annisa Aprilia Khairani','annisa-aprilia-khairani',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='annisa-aprilia-khairani' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://annisaaprilia4716-bit.github.io/annisaaprilia4716-bit')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'annisaaprilia4716 bit','https://annisaaprilia4716-bit.github.io/annisaaprilia4716-bit','GitHub Pages','Repo: annisaaprilia4716-bit');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://annisaaprilia4716-bit.github.io/nisa-ssalon')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'nisa ssalon','https://annisaaprilia4716-bit.github.io/nisa-ssalon','GitHub Pages','Repo: nisa-ssalon');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://annisaaprilia4716-bit.github.io/pilihan-makanan')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'pilihan makanan','https://annisaaprilia4716-bit.github.io/pilihan-makanan','GitHub Pages','Repo: pilihan-makanan');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://annisaaprilia4716-bit.github.io/ANNISA-dress')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'ANNISA dress','https://annisaaprilia4716-bit.github.io/ANNISA-dress','GitHub Pages','Repo: ANNISA-dress');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://annisaaprilia4716-bit.github.io/collectio-nisa-dress')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'collectio nisa dress','https://annisaaprilia4716-bit.github.io/collectio-nisa-dress','GitHub Pages','Repo: collectio-nisa-dress');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://annisaaprilia4716-bit.github.io/annisa-dresss')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'annisa dresss','https://annisaaprilia4716-bit.github.io/annisa-dresss','GitHub Pages','Repo: annisa-dresss');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://annisaaprilia4716-bit.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Annisa Aprilia Khairani · Site','https://annisaaprilia4716-bit.github.io','GitHub Pages','Repo: annisaaprilia4716-bit.github.io');
  end if;
  -- Aisyah Nur Syifa (8 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Aisyah Nur Syifa','aisyah-nur-syifa',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='aisyah-nur-syifa' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aisyahnursheeva.github.io/inilahjanjikupadamu')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'inilahjanjikupadamu','https://aisyahnursheeva.github.io/inilahjanjikupadamu','GitHub Pages','Repo: inilahjanjikupadamu');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aisyahnursheeva.github.io/ujianaisnilaisempurnasemua')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'ujianaisnilaisempurnasemua','https://aisyahnursheeva.github.io/ujianaisnilaisempurnasemua','GitHub Pages','Repo: ujianaisnilaisempurnasemua');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aisyahnursheeva.github.io/aisyahnursheeva')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'aisyahnursheeva','https://aisyahnursheeva.github.io/aisyahnursheeva','GitHub Pages','Repo: aisyahnursheeva');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aisyahnursheeva.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Aisyah Nur Syifa · Site','https://aisyahnursheeva.github.io','GitHub Pages','Repo: aisyahnursheeva.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aisyahnursheeva.github.io/HowItsDone')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'HowItsDone','https://aisyahnursheeva.github.io/HowItsDone','GitHub Pages','Repo: HowItsDone');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aisyahnursheeva.github.io/apapundemikamu')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'apapundemikamu','https://aisyahnursheeva.github.io/apapundemikamu','GitHub Pages','Repo: apapundemikamu');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aisyahnursheeva.github.io/Jamiela')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Jamiela','https://aisyahnursheeva.github.io/Jamiela','GitHub Pages','Repo: Jamiela');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://aisyahnursheeva.github.io/aisycaffee.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Aisyah Nur Syifa · Site','https://aisyahnursheeva.github.io/aisycaffee.github.io','GitHub Pages','Repo: aisycaffee.github.io');
  end if;
  -- Dafira Naila Nadhifa (3 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Dafira Naila Nadhifa','dafira-naila-nadhifa',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='dafira-naila-nadhifa' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://dafiranaila13.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Dafira Naila Nadhifa · Site','https://dafiranaila13.github.io','GitHub Pages','Repo: dafiranaila13.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://dafiranaila13.github.io/Romyk-1.0.0')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Romyk 1.0.0','https://dafiranaila13.github.io/Romyk-1.0.0','GitHub Pages','Repo: Romyk-1.0.0');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://dafiranaila13.github.io/Salone-1.0.0.zip')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Salone 1.0.0.zip','https://dafiranaila13.github.io/Salone-1.0.0.zip','GitHub Pages','Repo: Salone-1.0.0.zip');
  end if;
  -- Chayara Alima R (4 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Chayara Alima R','chayara-alima-r',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='chayara-alima-r' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://chayaraalima2031-crypto.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Chayara Alima R · Site','https://chayaraalima2031-crypto.github.io','GitHub Pages','Repo: chayaraalima2031-crypto.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://chayaraalima2031-crypto.github.io/restaurant')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'restaurant','https://chayaraalima2031-crypto.github.io/restaurant','GitHub Pages','Repo: restaurant');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://chayaraalima2031-crypto.github.io/matahari')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'matahari','https://chayaraalima2031-crypto.github.io/matahari','GitHub Pages','Repo: matahari');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://chayaraalima2031-crypto.github.io/kindergarten')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'kindergarten','https://chayaraalima2031-crypto.github.io/kindergarten','GitHub Pages','Repo: kindergarten');
  end if;
  -- Firstyaningtyas Nur Alya Adriana (6 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Firstyaningtyas Nur Alya Adriana','firstyaningtyas-nur-alya-adriana',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='firstyaningtyas-nur-alya-adriana' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://firstyaningtyasnur19-cloud.github.io/m0urnveillaa')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'m0urnveillaa','https://firstyaningtyasnur19-cloud.github.io/m0urnveillaa','GitHub Pages','Repo: m0urnveillaa');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://firstyaningtyasnur19-cloud.github.io/fugglerstore')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'fugglerstore','https://firstyaningtyasnur19-cloud.github.io/fugglerstore','GitHub Pages','Repo: fugglerstore');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://firstyaningtyasnur19-cloud.github.io/Start-Bootsrap')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Start Bootsrap','https://firstyaningtyasnur19-cloud.github.io/Start-Bootsrap','GitHub Pages','Repo: Start-Bootsrap');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://firstyaningtyasnur19-cloud.github.io/Sweetoria')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Sweetoria','https://firstyaningtyasnur19-cloud.github.io/Sweetoria','GitHub Pages','Repo: Sweetoria');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://firstyaningtyasnur19-cloud.github.io/Serenity-Wardrobe')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Serenity Wardrobe','https://firstyaningtyasnur19-cloud.github.io/Serenity-Wardrobe','GitHub Pages','Repo: Serenity-Wardrobe');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://firstyaningtyasnur19-cloud.github.io/Gyroztrore')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Gyroztrore','https://firstyaningtyasnur19-cloud.github.io/Gyroztrore','GitHub Pages','Repo: Gyroztrore');
  end if;
  -- Ghaisani Aurora (6 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Ghaisani Aurora','ghaisani-aurora',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='ghaisani-aurora' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ghaisaniaurora44-droid.github.io/birthdaydariara')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'birthdaydariara','https://ghaisaniaurora44-droid.github.io/birthdaydariara','GitHub Pages','Repo: birthdaydariara');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ghaisaniaurora44-droid.github.io/thebirthdayfromara')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'thebirthdayfromara','https://ghaisaniaurora44-droid.github.io/thebirthdayfromara','GitHub Pages','Repo: thebirthdayfromara');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ghaisaniaurora44-droid.github.io/cakezonera')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'cakezonera','https://ghaisaniaurora44-droid.github.io/cakezonera','GitHub Pages','Repo: cakezonera');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ghaisaniaurora44-droid.github.io/coffeeyummy')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'coffeeyummy','https://ghaisaniaurora44-droid.github.io/coffeeyummy','GitHub Pages','Repo: coffeeyummy');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ghaisaniaurora44-droid.github.io/marketaraa')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'marketaraa','https://ghaisaniaurora44-droid.github.io/marketaraa','GitHub Pages','Repo: marketaraa');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ghaisaniaurora44-droid.github.io/cosmetikraa')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'cosmetikraa','https://ghaisaniaurora44-droid.github.io/cosmetikraa','GitHub Pages','Repo: cosmetikraa');
  end if;
  -- Hanan Nur Hanifah ᯓ (5 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Hanan Nur Hanifah ᯓ','hanan-nur-hanifah',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='hanan-nur-hanifah' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://hanannur743-code.github.io/kyo.cafe')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'kyo.cafe','https://hanannur743-code.github.io/kyo.cafe','GitHub Pages','Repo: kyo.cafe');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://hanannur743-code.github.io/kyo.sushi')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'kyo.sushi','https://hanannur743-code.github.io/kyo.sushi','GitHub Pages','Repo: kyo.sushi');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://hanannur743-code.github.io/Kyo.chicken')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Kyo.chicken','https://hanannur743-code.github.io/Kyo.chicken','GitHub Pages','Repo: Kyo.chicken');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://hanannur743-code.github.io/Kyo.fashion')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Kyo.fashion','https://hanannur743-code.github.io/Kyo.fashion','GitHub Pages','Repo: Kyo.fashion');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://hanannur743-code.github.io/kyo.food')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'kyo.food','https://hanannur743-code.github.io/kyo.food','GitHub Pages','Repo: kyo.food');
  end if;
  -- Khansa Alkhumaira (9 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Khansa Alkhumaira','khansa-alkhumaira',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='khansa-alkhumaira' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://khansaal1180.github.io/delicious-food-chiee')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'delicious food chiee','https://khansaal1180.github.io/delicious-food-chiee','GitHub Pages','Repo: delicious-food-chiee');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://khansaal1180.github.io/kanal-s-broad')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'kanal s broad','https://khansaal1180.github.io/kanal-s-broad','GitHub Pages','Repo: kanal-s-broad');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://khansaal1180.github.io/electro')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'electro','https://khansaal1180.github.io/electro','GitHub Pages','Repo: electro');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://khansaal1180.github.io/metalcraft')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'metalcraft','https://khansaal1180.github.io/metalcraft','GitHub Pages','Repo: metalcraft');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://khansaal1180.github.io/coffee')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'coffee','https://khansaal1180.github.io/coffee','GitHub Pages','Repo: coffee');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://khansaal1180.github.io/lounge-cafe')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'lounge cafe','https://khansaal1180.github.io/lounge-cafe','GitHub Pages','Repo: lounge-cafe');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://khansaal1180.github.io/chef')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'chef','https://khansaal1180.github.io/chef','GitHub Pages','Repo: chef');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://khansaal1180.github.io/car-shop')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'car shop','https://khansaal1180.github.io/car-shop','GitHub Pages','Repo: car-shop');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://khansaal1180.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Khansa Alkhumaira · Site','https://khansaal1180.github.io','GitHub Pages','Repo: khansaal1180.github.io');
  end if;
  -- Nadhira Aquiny Pricillia Widodo (8 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Nadhira Aquiny Pricillia Widodo','nadhira-aquiny-pricillia-widodo',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='nadhira-aquiny-pricillia-widodo' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadhiraaquiny30-art.github.io/webuijiannadhirawinner.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Nadhira Aquiny Pricillia Widodo · Site','https://nadhiraaquiny30-art.github.io/webuijiannadhirawinner.github.io','GitHub Pages','Repo: webuijiannadhirawinner.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadhiraaquiny30-art.github.io/repomyklien.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Nadhira Aquiny Pricillia Widodo · Site','https://nadhiraaquiny30-art.github.io/repomyklien.github.io','GitHub Pages','Repo: repomyklien.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadhiraaquiny30-art.github.io/pakadimas.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Nadhira Aquiny Pricillia Widodo · Site','https://nadhiraaquiny30-art.github.io/pakadimas.github.io','GitHub Pages','Repo: pakadimas.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadhiraaquiny30-art.github.io/airachantiq.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Nadhira Aquiny Pricillia Widodo · Site','https://nadhiraaquiny30-art.github.io/airachantiq.github.io','GitHub Pages','Repo: airachantiq.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadhiraaquiny30-art.github.io/nadlekcokies.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Nadhira Aquiny Pricillia Widodo · Site','https://nadhiraaquiny30-art.github.io/nadlekcokies.github.io','GitHub Pages','Repo: nadlekcokies.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadhiraaquiny30-art.github.io/nadhrapw.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Nadhira Aquiny Pricillia Widodo · Site','https://nadhiraaquiny30-art.github.io/nadhrapw.github.io','GitHub Pages','Repo: nadhrapw.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadhiraaquiny30-art.github.io/pricildodo1704.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Nadhira Aquiny Pricillia Widodo · Site','https://nadhiraaquiny30-art.github.io/pricildodo1704.github.io','GitHub Pages','Repo: pricildodo1704.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadhiraaquiny30-art.github.io/nadhirapretty.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Nadhira Aquiny Pricillia Widodo · Site','https://nadhiraaquiny30-art.github.io/nadhirapretty.github.io','GitHub Pages','Repo: nadhirapretty.github.io');
  end if;
  -- Maiasa Aulia Rahma (4 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Maiasa Aulia Rahma','maiasa-aulia-rahma',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='maiasa-aulia-rahma' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://maiasaaulia-cyber.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Maiasa Aulia Rahma · Site','https://maiasaaulia-cyber.github.io','GitHub Pages','Repo: maiasaaulia-cyber.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://maiasaaulia-cyber.github.io/maiasaaulia-cyber')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'maiasaaulia cyber','https://maiasaaulia-cyber.github.io/maiasaaulia-cyber','GitHub Pages','Repo: maiasaaulia-cyber');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://maiasaaulia-cyber.github.io/Template-Random')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Template Random','https://maiasaaulia-cyber.github.io/Template-Random','GitHub Pages','Repo: Template-Random');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://maiasaaulia-cyber.github.io/yohooo')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'yohooo','https://maiasaaulia-cyber.github.io/yohooo','GitHub Pages','Repo: yohooo');
  end if;
  -- Nadifa Tazkiya (6 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Nadifa Tazkiya','nadifa-tazkiya',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='nadifa-tazkiya' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadifatazkiya61-cpu.github.io/nadipp-s-restaurant')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'nadipp s restaurant','https://nadifatazkiya61-cpu.github.io/nadipp-s-restaurant','GitHub Pages','Repo: nadipp-s-restaurant');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadifatazkiya61-cpu.github.io/nadd-s')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'nadd s','https://nadifatazkiya61-cpu.github.io/nadd-s','GitHub Pages','Repo: nadd-s');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadifatazkiya61-cpu.github.io/fresh-drink')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'fresh drink','https://nadifatazkiya61-cpu.github.io/fresh-drink','GitHub Pages','Repo: fresh-drink');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadifatazkiya61-cpu.github.io/nadipp')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'nadipp','https://nadifatazkiya61-cpu.github.io/nadipp','GitHub Pages','Repo: nadipp');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadifatazkiya61-cpu.github.io/cakeee')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'cakeee','https://nadifatazkiya61-cpu.github.io/cakeee','GitHub Pages','Repo: cakeee');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nadifatazkiya61-cpu.github.io/apaajaada')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'apaajaada','https://nadifatazkiya61-cpu.github.io/apaajaada','GitHub Pages','Repo: apaajaada');
  end if;
  -- Nazla Jahrotul Umami oゞ (1 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Nazla Jahrotul Umami oゞ','nazla-jahrotul-umami-o',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='nazla-jahrotul-umami-o' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nazlajahrotul.github.io/nazlajahrotul')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'nazlajahrotul','https://nazlajahrotul.github.io/nazlajahrotul','GitHub Pages','Repo: nazlajahrotul');
  end if;
  -- Nisa Azki Zafira (3 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Nisa Azki Zafira','nisa-azki-zafira',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='nisa-azki-zafira' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nisaazki46-wq.github.io/your-choise.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Nisa Azki Zafira · Site','https://nisaazki46-wq.github.io/your-choise.github.io','GitHub Pages','Repo: your-choise.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nisaazki46-wq.github.io/cihuyyy')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'cihuyyy','https://nisaazki46-wq.github.io/cihuyyy','GitHub Pages','Repo: cihuyyy');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nisaazki46-wq.github.io/apa_wae.lah')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'apa wae.lah','https://nisaazki46-wq.github.io/apa_wae.lah','GitHub Pages','Repo: apa_wae.lah');
  end if;
  -- Nafisha Ramadhani Afdal (8 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Nafisha Ramadhani Afdal','nafisha-ramadhani-afdal',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='nafisha-ramadhani-afdal' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nafisharamadhaniafdal-source.github.io/desi-s-day')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'desi s day','https://nafisharamadhaniafdal-source.github.io/desi-s-day','GitHub Pages','Repo: desi-s-day');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nafisharamadhaniafdal-source.github.io/mother-day')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'mother day','https://nafisharamadhaniafdal-source.github.io/mother-day','GitHub Pages','Repo: mother-day');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nafisharamadhaniafdal-source.github.io/hariibu')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'hariibu','https://nafisharamadhaniafdal-source.github.io/hariibu','GitHub Pages','Repo: hariibu');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nafisharamadhaniafdal-source.github.io/Ice-cream')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Ice cream','https://nafisharamadhaniafdal-source.github.io/Ice-cream','GitHub Pages','Repo: Ice-cream');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nafisharamadhaniafdal-source.github.io/Restaurant-Hits-')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Restaurant Hits','https://nafisharamadhaniafdal-source.github.io/Restaurant-Hits-','GitHub Pages','Repo: Restaurant-Hits-');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nafisharamadhaniafdal-source.github.io/juma-hospital')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'juma hospital','https://nafisharamadhaniafdal-source.github.io/juma-hospital','GitHub Pages','Repo: juma-hospital');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nafisharamadhaniafdal-source.github.io/massage-treatment-')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'massage treatment','https://nafisharamadhaniafdal-source.github.io/massage-treatment-','GitHub Pages','Repo: massage-treatment-');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nafisharamadhaniafdal-source.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Nafisha Ramadhani Afdal · Site','https://nafisharamadhaniafdal-source.github.io','GitHub Pages','Repo: nafisharamadhaniafdal-source.github.io');
  end if;
  -- Nazla Rahma Mahrul ramadhani (2 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Nazla Rahma Mahrul ramadhani','nazla-rahma-mahrul-ramadhani',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='nazla-rahma-mahrul-ramadhani' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rahmanazla786-cmyk.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Nazla Rahma Mahrul ramadhani · Site','https://rahmanazla786-cmyk.github.io','GitHub Pages','Repo: rahmanazla786-cmyk.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rahmanazla786-cmyk.github.io/toko-baju-korea')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'toko baju korea','https://rahmanazla786-cmyk.github.io/toko-baju-korea','GitHub Pages','Repo: toko-baju-korea');
  end if;
  -- Nisrina Willa Oktariyani (4 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Nisrina Willa Oktariyani','nisrina-willa-oktariyani',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='nisrina-willa-oktariyani' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nisrinawilla44-pixel.github.io/wila-s-restorant-')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'wila s restorant','https://nisrinawilla44-pixel.github.io/wila-s-restorant-','GitHub Pages','Repo: wila-s-restorant-');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nisrinawilla44-pixel.github.io/beauty-salonn')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'beauty salonn','https://nisrinawilla44-pixel.github.io/beauty-salonn','GitHub Pages','Repo: beauty-salonn');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nisrinawilla44-pixel.github.io/salonn')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'salonn','https://nisrinawilla44-pixel.github.io/salonn','GitHub Pages','Repo: salonn');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nisrinawilla44-pixel.github.io/chef')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'chef','https://nisrinawilla44-pixel.github.io/chef','GitHub Pages','Repo: chef');
  end if;
  -- Siti Kaleyana m.saleh muslim (2 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Siti Kaleyana m.saleh muslim','siti-kaleyana-m-saleh-muslim',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='siti-kaleyana-m-saleh-muslim' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sitikalyana50-byte.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Siti Kaleyana m.saleh muslim · Site','https://sitikalyana50-byte.github.io','GitHub Pages','Repo: sitikalyana50-byte.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sitikalyana50-byte.github.io/coffee-meyshoop')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'coffee meyshoop','https://sitikalyana50-byte.github.io/coffee-meyshoop','GitHub Pages','Repo: coffee-meyshoop');
  end if;
  -- Queena Sava Az-Zahra ʚɞ (5 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Queena Sava Az-Zahra ʚɞ','queena-sava-az-zahra',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='queena-sava-az-zahra' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queenasava42-ui.github.io/queenasava42-ui')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'queenasava42 ui','https://queenasava42-ui.github.io/queenasava42-ui','GitHub Pages','Repo: queenasava42-ui');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queenasava42-ui.github.io/MocaPio')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'MocaPio','https://queenasava42-ui.github.io/MocaPio','GitHub Pages','Repo: MocaPio');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queenasava42-ui.github.io/peppero')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'peppero','https://queenasava42-ui.github.io/peppero','GitHub Pages','Repo: peppero');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queenasava42-ui.github.io/TumblyWumbly')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'TumblyWumbly','https://queenasava42-ui.github.io/TumblyWumbly','GitHub Pages','Repo: TumblyWumbly');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queenasava42-ui.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Queena Sava Az-Zahra ʚɞ · Site','https://queenasava42-ui.github.io','GitHub Pages','Repo: queenasava42-ui.github.io');
  end if;
  -- Rifqa Alifia Nurmadina (6 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Rifqa Alifia Nurmadina','rifqa-alifia-nurmadina',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='rifqa-alifia-nurmadina' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rifqaalifia.github.io/photogalery')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'photogalery','https://rifqaalifia.github.io/photogalery','GitHub Pages','Repo: photogalery');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rifqaalifia.github.io/my-mart')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'my mart','https://rifqaalifia.github.io/my-mart','GitHub Pages','Repo: my-mart');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rifqaalifia.github.io/photograp')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'photograp','https://rifqaalifia.github.io/photograp','GitHub Pages','Repo: photograp');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rifqaalifia.github.io/my-cake')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'my cake','https://rifqaalifia.github.io/my-cake','GitHub Pages','Repo: my-cake');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rifqaalifia.github.io/my-ice-cream-store-')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'my ice cream store','https://rifqaalifia.github.io/my-ice-cream-store-','GitHub Pages','Repo: my-ice-cream-store-');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rifqaalifia.github.io/ice-cream-my')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'ice cream my','https://rifqaalifia.github.io/ice-cream-my','GitHub Pages','Repo: ice-cream-my');
  end if;
  -- Wardah Nur Zahirah (2 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Wardah Nur Zahirah','wardah-nur-zahirah',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='wardah-nur-zahirah' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://wardahnur.github.io/Restaurant-food-sunday')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Restaurant food sunday','https://wardahnur.github.io/Restaurant-food-sunday','GitHub Pages','Repo: Restaurant-food-sunday');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://wardahnur.github.io/zahirah-klinik')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'zahirah klinik','https://wardahnur.github.io/zahirah-klinik','GitHub Pages','Repo: zahirah-klinik');
  end if;
  -- Siti Zahra (6 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Siti Zahra','siti-zahra',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='siti-zahra' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://SitiZahra23.github.io/keonor')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'keonor','https://SitiZahra23.github.io/keonor','GitHub Pages','Repo: keonor');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://SitiZahra23.github.io/PTS17SEP')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'PTS17SEP','https://SitiZahra23.github.io/PTS17SEP','GitHub Pages','Repo: PTS17SEP');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://SitiZahra23.github.io/dalgom')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'dalgom','https://SitiZahra23.github.io/dalgom','GitHub Pages','Repo: dalgom');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://SitiZahra23.github.io/KEYCHAINTEA')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'KEYCHAINTEA','https://SitiZahra23.github.io/KEYCHAINTEA','GitHub Pages','Repo: KEYCHAINTEA');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://SitiZahra23.github.io/DODORI')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'DODORI','https://SitiZahra23.github.io/DODORI','GitHub Pages','Repo: DODORI');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://SitiZahra23.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Siti Zahra · Site','https://SitiZahra23.github.io','GitHub Pages','Repo: SitiZahra23.github.io');
  end if;
  -- siti dea armanda (5 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('siti dea armanda','siti-dea-armanda',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='siti-dea-armanda' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sitidea1039-afk.github.io/freshmart78')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'freshmart78','https://sitidea1039-afk.github.io/freshmart78','GitHub Pages','Repo: freshmart78');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sitidea1039-afk.github.io/buy')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'buy','https://sitidea1039-afk.github.io/buy','GitHub Pages','Repo: buy');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sitidea1039-afk.github.io/solusi-')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'solusi','https://sitidea1039-afk.github.io/solusi-','GitHub Pages','Repo: solusi-');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sitidea1039-afk.github.io/qohwah')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'qohwah','https://sitidea1039-afk.github.io/qohwah','GitHub Pages','Repo: qohwah');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sitidea1039-afk.github.io/coffe-shop')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'coffe shop','https://sitidea1039-afk.github.io/coffe-shop','GitHub Pages','Repo: coffe-shop');
  end if;
  -- Talitha Raissa Ramadhani (6 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Talitha Raissa Ramadhani','talitha-raissa-ramadhani',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='talitha-raissa-ramadhani' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://tales1708.github.io/taletha')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'taletha','https://tales1708.github.io/taletha','GitHub Pages','Repo: taletha');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://tales1708.github.io/tales1708')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'tales1708','https://tales1708.github.io/tales1708','GitHub Pages','Repo: tales1708');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://tales1708.github.io/pts27')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'pts27','https://tales1708.github.io/pts27','GitHub Pages','Repo: pts27');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://tales1708.github.io/w0w')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'w0w','https://tales1708.github.io/w0w','GitHub Pages','Repo: w0w');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://tales1708.github.io/hottels17')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'hottels17','https://tales1708.github.io/hottels17','GitHub Pages','Repo: hottels17');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://tales1708.github.io/tales17')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'tales17','https://tales1708.github.io/tales17','GitHub Pages','Repo: tales17');
  end if;
  -- Zahira Syahda (6 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Zahira Syahda','zahira-syahda',aid,'51','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='zahira-syahda' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zahirasyahda.github.io/CHOCO.ID')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'CHOCO.ID','https://zahirasyahda.github.io/CHOCO.ID','GitHub Pages','Repo: CHOCO.ID');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zahirasyahda.github.io/hai')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'hai','https://zahirasyahda.github.io/hai','GitHub Pages','Repo: hai');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zahirasyahda.github.io/tasty.id')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'tasty.id','https://zahirasyahda.github.io/tasty.id','GitHub Pages','Repo: tasty.id');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zahirasyahda.github.io/ice.id')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'ice.id','https://zahirasyahda.github.io/ice.id','GitHub Pages','Repo: ice.id');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zahirasyahda.github.io/travel.id')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'travel.id','https://zahirasyahda.github.io/travel.id','GitHub Pages','Repo: travel.id');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zahirasyahda.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Zahira Syahda · Site','https://zahirasyahda.github.io','GitHub Pages','Repo: zahirasyahda.github.io');
  end if;
  -- Aura zeta azkia (4 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Aura zeta azkia','aura-zeta-azkia',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='aura-zeta-azkia' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ZET40.github.io/freshies')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'freshies','https://ZET40.github.io/freshies','GitHub Pages','Repo: freshies');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ZET40.github.io/foodies')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'foodies','https://ZET40.github.io/foodies','GitHub Pages','Repo: foodies');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ZET40.github.io/zaeta-s')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'zaeta s','https://ZET40.github.io/zaeta-s','GitHub Pages','Repo: zaeta-s');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://ZET40.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Aura zeta azkia · Site','https://ZET40.github.io','GitHub Pages','Repo: ZET40.github.io');
  end if;
  -- Chaisa Fitriah (1 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Chaisa Fitriah','chaisa-fitriah',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='chaisa-fitriah' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://chaisafitriah31-cpu.github.io/cece')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'cece','https://chaisafitriah31-cpu.github.io/cece','GitHub Pages','Repo: cece');
  end if;
  -- Aira Zaimatunnisa Al-hidayat (9 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Aira Zaimatunnisa Al-hidayat','aira-zaimatunnisa-al-hidayat',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='aira-zaimatunnisa-al-hidayat' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://airazai.github.io/stepout')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'stepout','https://airazai.github.io/stepout','GitHub Pages','Repo: stepout');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://airazai.github.io/stepout.store')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'stepout.store','https://airazai.github.io/stepout.store','GitHub Pages','Repo: stepout.store');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://airazai.github.io/stepout-github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'stepout github.io','https://airazai.github.io/stepout-github.io','GitHub Pages','Repo: stepout-github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://airazai.github.io/ChainedUp-Shopcancel')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'ChainedUp Shopcancel','https://airazai.github.io/ChainedUp-Shopcancel','GitHub Pages','Repo: ChainedUp-Shopcancel');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://airazai.github.io/the-pasta-lab.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Aira Zaimatunnisa Al-hidayat · Site','https://airazai.github.io/the-pasta-lab.github.io','GitHub Pages','Repo: the-pasta-lab.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://airazai.github.io/ChainedUp-Store')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'ChainedUp Store','https://airazai.github.io/ChainedUp-Store','GitHub Pages','Repo: ChainedUp-Store');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://airazai.github.io/ChainedUpcancel')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'ChainedUpcancel','https://airazai.github.io/ChainedUpcancel','GitHub Pages','Repo: ChainedUpcancel');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://airazai.github.io/keychain-shopcancel')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'keychain shopcancel','https://airazai.github.io/keychain-shopcancel','GitHub Pages','Repo: keychain-shopcancel');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://airazai.github.io/airazai-cancel')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'airazai cancel','https://airazai.github.io/airazai-cancel','GitHub Pages','Repo: airazai-cancel');
  end if;
  -- Balqis Alilah (3 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Balqis Alilah','balqis-alilah',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='balqis-alilah' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://qieesaali.github.io/snak-and-drink')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'snak and drink','https://qieesaali.github.io/snak-and-drink','GitHub Pages','Repo: snak-and-drink');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://qieesaali.github.io/cokies-pastry.githup.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'cokies pastry.githup.io','https://qieesaali.github.io/cokies-pastry.githup.io','GitHub Pages','Repo: cokies-pastry.githup.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://qieesaali.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Balqis Alilah · Site','https://qieesaali.github.io','GitHub Pages','Repo: qieesaali.github.io');
  end if;
  -- Azka Sahla Hanum (4 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Azka Sahla Hanum','azka-sahla-hanum',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='azka-sahla-hanum' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://azkasahla68-cpu.github.io/Fashion-Hive')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Fashion Hive','https://azkasahla68-cpu.github.io/Fashion-Hive','GitHub Pages','Repo: Fashion-Hive');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://azkasahla68-cpu.github.io/zkaasahla')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'zkaasahla','https://azkasahla68-cpu.github.io/zkaasahla','GitHub Pages','Repo: zkaasahla');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://azkasahla68-cpu.github.io/levant')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'levant','https://azkasahla68-cpu.github.io/levant','GitHub Pages','Repo: levant');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://azkasahla68-cpu.github.io/luxurybrand')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'luxurybrand','https://azkasahla68-cpu.github.io/luxurybrand','GitHub Pages','Repo: luxurybrand');
  end if;
  -- Anisha Fadilla Ramadhani (9 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Anisha Fadilla Ramadhani','anisha-fadilla-ramadhani',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='anisha-fadilla-ramadhani' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nishajournaling.github.io/Darunnishakitab.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Anisha Fadilla Ramadhani · Site','https://nishajournaling.github.io/Darunnishakitab.github.io','GitHub Pages','Repo: Darunnishakitab.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nishajournaling.github.io/nishkitab.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Anisha Fadilla Ramadhani · Site','https://nishajournaling.github.io/nishkitab.github.io','GitHub Pages','Repo: nishkitab.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nishajournaling.github.io/nishajougit.hub')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'nishajougit.hub','https://nishajournaling.github.io/nishajougit.hub','GitHub Pages','Repo: nishajougit.hub');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nishajournaling.github.io/nishpastry.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Anisha Fadilla Ramadhani · Site','https://nishajournaling.github.io/nishpastry.github.io','GitHub Pages','Repo: nishpastry.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nishajournaling.github.io/nishatoys.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Anisha Fadilla Ramadhani · Site','https://nishajournaling.github.io/nishatoys.github.io','GitHub Pages','Repo: nishatoys.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nishajournaling.github.io/nishstory.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Anisha Fadilla Ramadhani · Site','https://nishajournaling.github.io/nishstory.github.io','GitHub Pages','Repo: nishstory.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nishajournaling.github.io/nishshree.github.oi')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'nishshree.github.oi','https://nishajournaling.github.io/nishshree.github.oi','GitHub Pages','Repo: nishshree.github.oi');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nishajournaling.github.io/nishashar-ee.github.oi')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'nishashar ee.github.oi','https://nishajournaling.github.io/nishashar-ee.github.oi','GitHub Pages','Repo: nishashar-ee.github.oi');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nishajournaling.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Anisha Fadilla Ramadhani · Site','https://nishajournaling.github.io','GitHub Pages','Repo: nishajournaling.github.io');
  end if;
  -- Deswita Aristaputri Khoirunisa (1 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Deswita Aristaputri Khoirunisa','deswita-aristaputri-khoirunisa',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='deswita-aristaputri-khoirunisa' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://khoirunisa30.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Deswita Aristaputri Khoirunisa · Site','https://khoirunisa30.github.io','GitHub Pages','Repo: khoirunisa30.github.io');
  end if;
  -- Firyal Naqiyyah El-Ridwan (2 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Firyal Naqiyyah El-Ridwan','firyal-naqiyyah-el-ridwan',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='firyal-naqiyyah-el-ridwan' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://firyalnaqiyyah6-bot.github.io/cafedejavu')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'cafedejavu','https://firyalnaqiyyah6-bot.github.io/cafedejavu','GitHub Pages','Repo: cafedejavu');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://firyalnaqiyyah6-bot.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Firyal Naqiyyah El-Ridwan · Site','https://firyalnaqiyyah6-bot.github.io','GitHub Pages','Repo: firyalnaqiyyah6-bot.github.io');
  end if;
  -- Hilda Dihyan Calysta (5 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Hilda Dihyan Calysta','hilda-dihyan-calysta',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='hilda-dihyan-calysta' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://hildadc.github.io/Warung-Rasa')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Warung Rasa','https://hildadc.github.io/Warung-Rasa','GitHub Pages','Repo: Warung-Rasa');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://hildadc.github.io/hildadcc.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Hilda Dihyan Calysta · Site','https://hildadc.github.io/hildadcc.github.io','GitHub Pages','Repo: hildadcc.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://hildadc.github.io/Rempah-')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Rempah','https://hildadc.github.io/Rempah-','GitHub Pages','Repo: Rempah-');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://hildadc.github.io/lumerbites')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'lumerbites','https://hildadc.github.io/lumerbites','GitHub Pages','Repo: lumerbites');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://hildadc.github.io/mossewear')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'mossewear','https://hildadc.github.io/mossewear','GitHub Pages','Repo: mossewear');
  end if;
  -- Jemalia Khairany (4 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Jemalia Khairany','jemalia-khairany',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='jemalia-khairany' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://jemmaaa88.github.io/sweethome')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'sweethome','https://jemmaaa88.github.io/sweethome','GitHub Pages','Repo: sweethome');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://jemmaaa88.github.io/jemmaa.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Jemalia Khairany · Site','https://jemmaaa88.github.io/jemmaa.github.io','GitHub Pages','Repo: jemmaa.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://jemmaaa88.github.io/stitchery')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'stitchery','https://jemmaaa88.github.io/stitchery','GitHub Pages','Repo: stitchery');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://jemmaaa88.github.io/matcheese')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'matcheese','https://jemmaaa88.github.io/matcheese','GitHub Pages','Repo: matcheese');
  end if;
  -- Diny Aminarti (13 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Diny Aminarti','diny-aminarti',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='diny-aminarti' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/d-fashionew')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'d fashionew','https://Dinymnr.github.io/d-fashionew','GitHub Pages','Repo: d-fashionew');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/d-shoes')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'d shoes','https://Dinymnr.github.io/d-shoes','GitHub Pages','Repo: d-shoes');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/shoesor')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'shoesor','https://Dinymnr.github.io/shoesor','GitHub Pages','Repo: shoesor');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/d-skincare.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Diny Aminarti · Site','https://Dinymnr.github.io/d-skincare.github.io','GitHub Pages','Repo: d-skincare.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/d-marketplace')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'d marketplace','https://Dinymnr.github.io/d-marketplace','GitHub Pages','Repo: d-marketplace');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/dconcertic')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'dconcertic','https://Dinymnr.github.io/dconcertic','GitHub Pages','Repo: dconcertic');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/d-konsyertic')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'d konsyertic','https://Dinymnr.github.io/d-konsyertic','GitHub Pages','Repo: d-konsyertic');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/d-konsertic')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'d konsertic','https://Dinymnr.github.io/d-konsertic','GitHub Pages','Repo: d-konsertic');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/d-concerticz')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'d concerticz','https://Dinymnr.github.io/d-concerticz','GitHub Pages','Repo: d-concerticz');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/d-concerticc')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'d concerticc','https://Dinymnr.github.io/d-concerticc','GitHub Pages','Repo: d-concerticc');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/d-concertic')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'d concertic','https://Dinymnr.github.io/d-concertic','GitHub Pages','Repo: d-concertic');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/ticketcon.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Diny Aminarti · Site','https://Dinymnr.github.io/ticketcon.github.io','GitHub Pages','Repo: ticketcon.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://Dinymnr.github.io/d-skincarez.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Diny Aminarti · Site','https://Dinymnr.github.io/d-skincarez.github.io','GitHub Pages','Repo: d-skincarez.github.io');
  end if;
  -- Fitriyah Nadifah (7 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Fitriyah Nadifah','fitriyah-nadifah',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='fitriyah-nadifah' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fitriyah735.github.io/cakepupus')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'cakepupus','https://fitriyah735.github.io/cakepupus','GitHub Pages','Repo: cakepupus');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fitriyah735.github.io/Baked_Bloom')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Baked Bloom','https://fitriyah735.github.io/Baked_Bloom','GitHub Pages','Repo: Baked_Bloom');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fitriyah735.github.io/elysianfragrance')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'elysianfragrance','https://fitriyah735.github.io/elysianfragrance','GitHub Pages','Repo: elysianfragrance');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fitriyah735.github.io/bakedbloomm')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'bakedbloomm','https://fitriyah735.github.io/bakedbloomm','GitHub Pages','Repo: bakedbloomm');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fitriyah735.github.io/bakedbloom')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'bakedbloom','https://fitriyah735.github.io/bakedbloom','GitHub Pages','Repo: bakedbloom');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fitriyah735.github.io/eleysianfragrance')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'eleysianfragrance','https://fitriyah735.github.io/eleysianfragrance','GitHub Pages','Repo: eleysianfragrance');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fitriyah735.github.io/elysiaanfragrance')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'elysiaanfragrance','https://fitriyah735.github.io/elysiaanfragrance','GitHub Pages','Repo: elysiaanfragrance');
  end if;
  -- Keyra Aisyah Arafat (5 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Keyra Aisyah Arafat','keyra-aisyah-arafat',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='keyra-aisyah-arafat' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://keyra86.github.io/keyra86')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'keyra86','https://keyra86.github.io/keyra86','GitHub Pages','Repo: keyra86');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://keyra86.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Keyra Aisyah Arafat · Site','https://keyra86.github.io','GitHub Pages','Repo: keyra86.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://keyra86.github.io/healthybakery')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'healthybakery','https://keyra86.github.io/healthybakery','GitHub Pages','Repo: healthybakery');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://keyra86.github.io/chefer')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'chefer','https://keyra86.github.io/chefer','GitHub Pages','Repo: chefer');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://keyra86.github.io/flowries.store')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'flowries.store','https://keyra86.github.io/flowries.store','GitHub Pages','Repo: flowries.store');
  end if;
  -- Mozza Rayhanna Taqwa (5 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Mozza Rayhanna Taqwa','mozza-rayhanna-taqwa',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='mozza-rayhanna-taqwa' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://mozzarayhanna13-sys.github.io/homesweetbakery')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'homesweetbakery','https://mozzarayhanna13-sys.github.io/homesweetbakery','GitHub Pages','Repo: homesweetbakery');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://mozzarayhanna13-sys.github.io/stuff-co')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'stuff co','https://mozzarayhanna13-sys.github.io/stuff-co','GitHub Pages','Repo: stuff-co');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://mozzarayhanna13-sys.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Mozza Rayhanna Taqwa · Site','https://mozzarayhanna13-sys.github.io','GitHub Pages','Repo: mozzarayhanna13-sys.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://mozzarayhanna13-sys.github.io/MnZsalonz')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'MnZsalonz','https://mozzarayhanna13-sys.github.io/MnZsalonz','GitHub Pages','Repo: MnZsalonz');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://mozzarayhanna13-sys.github.io/Pastry-Coffee')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Pastry Coffee','https://mozzarayhanna13-sys.github.io/Pastry-Coffee','GitHub Pages','Repo: Pastry-Coffee');
  end if;
  -- Naifa Ghaisani (11 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Naifa Ghaisani','naifa-ghaisani',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='naifa-ghaisani' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://naaifa.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Naifa Ghaisani · Site','https://naaifa.github.io','GitHub Pages','Repo: naaifa.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://naaifa.github.io/Navaae')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Navaae','https://naaifa.github.io/Navaae','GitHub Pages','Repo: Navaae');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://naaifa.github.io/Naivest')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Naivest','https://naaifa.github.io/Naivest','GitHub Pages','Repo: Naivest');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://naaifa.github.io/nailowers')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'nailowers','https://naaifa.github.io/nailowers','GitHub Pages','Repo: nailowers');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://naaifa.github.io/Floranifa')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Floranifa','https://naaifa.github.io/Floranifa','GitHub Pages','Repo: Floranifa');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://naaifa.github.io/Laa-Miel-Bakery')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Laa Miel Bakery','https://naaifa.github.io/Laa-Miel-Bakery','GitHub Pages','Repo: Laa-Miel-Bakery');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://naaifa.github.io/La-Miell-Bakery')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'La Miell Bakery','https://naaifa.github.io/La-Miell-Bakery','GitHub Pages','Repo: La-Miell-Bakery');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://naaifa.github.io/La-Miel-Bakery')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'La Miel Bakery','https://naaifa.github.io/La-Miel-Bakery','GitHub Pages','Repo: La-Miel-Bakery');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://naaifa.github.io/GoldenCrust-')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'GoldenCrust','https://naaifa.github.io/GoldenCrust-','GitHub Pages','Repo: GoldenCrust-');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://naaifa.github.io/Goldencrust')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Goldencrust','https://naaifa.github.io/Goldencrust','GitHub Pages','Repo: Goldencrust');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://naaifa.github.io/Honey-Crumb-')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Honey Crumb','https://naaifa.github.io/Honey-Crumb-','GitHub Pages','Repo: Honey-Crumb-');
  end if;
  -- Keishara Amaraesya Zalfa (4 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Keishara Amaraesya Zalfa','keishara-amaraesya-zalfa',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='keishara-amaraesya-zalfa' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://keisharaamara.github.io/-themerchandies')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'themerchandies','https://keisharaamara.github.io/-themerchandies','GitHub Pages','Repo: -themerchandies');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://keisharaamara.github.io/amara-s-collection')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'amara s collection','https://keisharaamara.github.io/amara-s-collection','GitHub Pages','Repo: amara-s-collection');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://keisharaamara.github.io/aestheticphonecase')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'aestheticphonecase','https://keisharaamara.github.io/aestheticphonecase','GitHub Pages','Repo: aestheticphonecase');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://keisharaamara.github.io/warung-si-mbok')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'warung si mbok','https://keisharaamara.github.io/warung-si-mbok','GitHub Pages','Repo: warung-si-mbok');
  end if;
  -- Naira Sancyah Putri (2 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Naira Sancyah Putri','naira-sancyah-putri',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='naira-sancyah-putri' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nairasancyah44-cloud.github.io/nairasancyahputri')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'nairasancyahputri','https://nairasancyah44-cloud.github.io/nairasancyahputri','GitHub Pages','Repo: nairasancyahputri');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nairasancyah44-cloud.github.io/naira')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'naira','https://nairasancyah44-cloud.github.io/naira','GitHub Pages','Repo: naira');
  end if;
  -- Keisya Putri Fazaria (6 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Keisya Putri Fazaria','keisya-putri-fazaria',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='keisya-putri-fazaria' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sicantikanggunly.github.io/keisyaputriujian1')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'keisyaputriujian1','https://sicantikanggunly.github.io/keisyaputriujian1','GitHub Pages','Repo: keisyaputriujian1');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sicantikanggunly.github.io/bobyyy.gifthub.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'bobyyy.gifthub.io','https://sicantikanggunly.github.io/bobyyy.gifthub.io','GitHub Pages','Repo: bobyyy.gifthub.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sicantikanggunly.github.io/thisemeraldworld')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'thisemeraldworld','https://sicantikanggunly.github.io/thisemeraldworld','GitHub Pages','Repo: thisemeraldworld');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sicantikanggunly.github.io/seraphinajewels')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'seraphinajewels','https://sicantikanggunly.github.io/seraphinajewels','GitHub Pages','Repo: seraphinajewels');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sicantikanggunly.github.io/emeraldworld')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'emeraldworld','https://sicantikanggunly.github.io/emeraldworld','GitHub Pages','Repo: emeraldworld');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sicantikanggunly.github.io/Seraphina-Jewels')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Seraphina Jewels','https://sicantikanggunly.github.io/Seraphina-Jewels','GitHub Pages','Repo: Seraphina-Jewels');
  end if;
  -- Fawwazah sakhi maheswari (12 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Fawwazah sakhi maheswari','fawwazah-sakhi-maheswari',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='fawwazah-sakhi-maheswari' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fawwazah.github.io/TUGAS_PTS_FAWWAZAH')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'TUGAS PTS FAWWAZAH','https://fawwazah.github.io/TUGAS_PTS_FAWWAZAH','GitHub Pages','Repo: TUGAS_PTS_FAWWAZAH');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fawwazah.github.io/FAWWAZAH..')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'FAWWAZAH..','https://fawwazah.github.io/FAWWAZAH..','GitHub Pages','Repo: FAWWAZAH..');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fawwazah.github.io/fawwazah1')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'fawwazah1','https://fawwazah.github.io/fawwazah1','GitHub Pages','Repo: fawwazah1');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fawwazah.github.io/happy-sweet-seventeen-wiwaw')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'happy sweet seventeen wiwaw','https://fawwazah.github.io/happy-sweet-seventeen-wiwaw','GitHub Pages','Repo: happy-sweet-seventeen-wiwaw');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fawwazah.github.io/happy-sweet-seventeen-beb')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'happy sweet seventeen beb','https://fawwazah.github.io/happy-sweet-seventeen-beb','GitHub Pages','Repo: happy-sweet-seventeen-beb');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fawwazah.github.io/Cake-Fantasies-by-paw')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Cake Fantasies by paw','https://fawwazah.github.io/Cake-Fantasies-by-paw','GitHub Pages','Repo: Cake-Fantasies-by-paw');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fawwazah.github.io/Glide-Cakes-paw')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Glide Cakes paw','https://fawwazah.github.io/Glide-Cakes-paw','GitHub Pages','Repo: Glide-Cakes-paw');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fawwazah.github.io/Kiddie-Land-piw-paww')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Kiddie Land piw paww','https://fawwazah.github.io/Kiddie-Land-piw-paww','GitHub Pages','Repo: Kiddie-Land-piw-paww');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fawwazah.github.io/Kiddie-Land-piw-paw')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Kiddie Land piw paw','https://fawwazah.github.io/Kiddie-Land-piw-paw','GitHub Pages','Repo: Kiddie-Land-piw-paw');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fawwazah.github.io/Aether-Apparel-toko-baju-kiyowo')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Aether Apparel toko baju kiyowo','https://fawwazah.github.io/Aether-Apparel-toko-baju-kiyowo','GitHub Pages','Repo: Aether-Apparel-toko-baju-kiyowo');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fawwazah.github.io/happy-birthday')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'happy birthday','https://fawwazah.github.io/happy-birthday','GitHub Pages','Repo: happy-birthday');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://fawwazah.github.io/Sweet-Treats-cake')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Sweet Treats cake','https://fawwazah.github.io/Sweet-Treats-cake','GitHub Pages','Repo: Sweet-Treats-cake');
  end if;
  -- Nismah Faruk Zaini (4 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Nismah Faruk Zaini','nismah-faruk-zaini',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='nismah-faruk-zaini' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nismah12.github.io/template')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'template','https://nismah12.github.io/template','GitHub Pages','Repo: template');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nismah12.github.io/coolcloudd')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'coolcloudd','https://nismah12.github.io/coolcloudd','GitHub Pages','Repo: coolcloudd');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nismah12.github.io/nismah12-cpu.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Nismah Faruk Zaini · Site','https://nismah12.github.io/nismah12-cpu.github.io','GitHub Pages','Repo: nismah12-cpu.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://nismah12.github.io/sweetloaf')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'sweetloaf','https://nismah12.github.io/sweetloaf','GitHub Pages','Repo: sweetloaf');
  end if;
  -- Rogwan Soraya (5 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Rogwan Soraya','rogwan-soraya',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='rogwan-soraya' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://codenamesora.github.io/Artiqcanvas')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Artiqcanvas','https://codenamesora.github.io/Artiqcanvas','GitHub Pages','Repo: Artiqcanvas');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://codenamesora.github.io/test')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'test','https://codenamesora.github.io/test','GitHub Pages','Repo: test');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://codenamesora.github.io/soraeatery')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'soraeatery','https://codenamesora.github.io/soraeatery','GitHub Pages','Repo: soraeatery');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://codenamesora.github.io/pekofishery')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'pekofishery','https://codenamesora.github.io/pekofishery','GitHub Pages','Repo: pekofishery');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://codenamesora.github.io/noirrebel.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Rogwan Soraya · Site','https://codenamesora.github.io/noirrebel.github.io','GitHub Pages','Repo: noirrebel.github.io');
  end if;
  -- Queensha Azzahra Hibatullah (9 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Queensha Azzahra Hibatullah','queensha-azzahra-hibatullah',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='queensha-azzahra-hibatullah' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queensh4.github.io/Aurela')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Aurela','https://queensh4.github.io/Aurela','GitHub Pages','Repo: Aurela');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queensh4.github.io/lokalicious')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'lokalicious','https://queensh4.github.io/lokalicious','GitHub Pages','Repo: lokalicious');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queensh4.github.io/food_funday')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'food funday','https://queensh4.github.io/food_funday','GitHub Pages','Repo: food_funday');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queensh4.github.io/solid-robot')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'solid robot','https://queensh4.github.io/solid-robot','GitHub Pages','Repo: solid-robot');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queensh4.github.io/Veloura')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Veloura','https://queensh4.github.io/Veloura','GitHub Pages','Repo: Veloura');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queensh4.github.io/frame-')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'frame','https://queensh4.github.io/frame-','GitHub Pages','Repo: frame-');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queensh4.github.io/alir')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'alir','https://queensh4.github.io/alir','GitHub Pages','Repo: alir');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queensh4.github.io/Veloura.')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Veloura.','https://queensh4.github.io/Veloura.','GitHub Pages','Repo: Veloura.');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://queensh4.github.io/Moonlit.co')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Moonlit.co','https://queensh4.github.io/Moonlit.co','GitHub Pages','Repo: Moonlit.co');
  end if;
  -- Sahirah Hasanah (5 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Sahirah Hasanah','sahirah-hasanah',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='sahirah-hasanah' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sahira4710.github.io/pts')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'pts','https://sahira4710.github.io/pts','GitHub Pages','Repo: pts');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sahira4710.github.io/pulse-on-tour-2027')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'pulse on tour 2027','https://sahira4710.github.io/pulse-on-tour-2027','GitHub Pages','Repo: pulse-on-tour-2027');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sahira4710.github.io/vinyl')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'vinyl','https://sahira4710.github.io/vinyl','GitHub Pages','Repo: vinyl');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sahira4710.github.io/sahira4710-cpu.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Sahirah Hasanah · Site','https://sahira4710.github.io/sahira4710-cpu.github.io','GitHub Pages','Repo: sahira4710-cpu.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://sahira4710.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Sahirah Hasanah · Site','https://sahira4710.github.io','GitHub Pages','Repo: sahira4710.github.io');
  end if;
  -- Rufaida Hawa Syafiyya (8 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Rufaida Hawa Syafiyya','rufaida-hawa-syafiyya',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='rufaida-hawa-syafiyya' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rufaidahawa30-hue.github.io/stsrufaida5b')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'stsrufaida5b','https://rufaidahawa30-hue.github.io/stsrufaida5b','GitHub Pages','Repo: stsrufaida5b');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rufaidahawa30-hue.github.io/ptsrufaida52')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'ptsrufaida52','https://rufaidahawa30-hue.github.io/ptsrufaida52','GitHub Pages','Repo: ptsrufaida52');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rufaidahawa30-hue.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Rufaida Hawa Syafiyya · Site','https://rufaidahawa30-hue.github.io','GitHub Pages','Repo: rufaidahawa30-hue.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rufaidahawa30-hue.github.io/Afiya-CO.')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Afiya CO.','https://rufaidahawa30-hue.github.io/Afiya-CO.','GitHub Pages','Repo: Afiya-CO.');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rufaidahawa30-hue.github.io/rufaidahwa')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'rufaidahwa','https://rufaidahawa30-hue.github.io/rufaidahwa','GitHub Pages','Repo: rufaidahwa');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rufaidahawa30-hue.github.io/magichappens')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'magichappens','https://rufaidahawa30-hue.github.io/magichappens','GitHub Pages','Repo: magichappens');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rufaidahawa30-hue.github.io/d-afiya-co.')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'d afiya co.','https://rufaidahawa30-hue.github.io/d-afiya-co.','GitHub Pages','Repo: d-afiya-co.');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://rufaidahawa30-hue.github.io/AfiyaCollection')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'AfiyaCollection','https://rufaidahawa30-hue.github.io/AfiyaCollection','GitHub Pages','Repo: AfiyaCollection');
  end if;
  -- Salsabila Qurota'ayun (7 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Salsabila Qurota''ayun','salsabila-qurota-ayun',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='salsabila-qurota-ayun' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://saaqr.github.io/pts')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'pts','https://saaqr.github.io/pts','GitHub Pages','Repo: pts');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://saaqr.github.io/saaqr.cancel')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'saaqr.cancel','https://saaqr.github.io/saaqr.cancel','GitHub Pages','Repo: saaqr.cancel');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://saaqr.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Salsabila Qurota''ayun · Site','https://saaqr.github.io','GitHub Pages','Repo: saaqr.github.io');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://saaqr.github.io/strjogja')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'strjogja','https://saaqr.github.io/strjogja','GitHub Pages','Repo: strjogja');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://saaqr.github.io/javabkstr')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'javabkstr','https://saaqr.github.io/javabkstr','GitHub Pages','Repo: javabkstr');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://saaqr.github.io/bookstore')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'bookstore','https://saaqr.github.io/bookstore','GitHub Pages','Repo: bookstore');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://saaqr.github.io/vivamusic')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'vivamusic','https://saaqr.github.io/vivamusic','GitHub Pages','Repo: vivamusic');
  end if;
  -- Tarissa noerista lestady (2 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Tarissa noerista lestady','tarissa-noerista-lestady',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='tarissa-noerista-lestady' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://tarissanoerista50-prog.github.io/tarissachaa')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'tarissachaa','https://tarissanoerista50-prog.github.io/tarissachaa','GitHub Pages','Repo: tarissachaa');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://tarissanoerista50-prog.github.io/chanshop')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'chanshop','https://tarissanoerista50-prog.github.io/chanshop','GitHub Pages','Repo: chanshop');
  end if;
  -- Silvia Triandhini (6 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Silvia Triandhini','silvia-triandhini',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='silvia-triandhini' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://silvia2552.github.io/likeumore')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'likeumore','https://silvia2552.github.io/likeumore','GitHub Pages','Repo: likeumore');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://silvia2552.github.io/coffe-withsugarmilk')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'coffe withsugarmilk','https://silvia2552.github.io/coffe-withsugarmilk','GitHub Pages','Repo: coffe-withsugarmilk');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://silvia2552.github.io/baju-mahal-berkualitas')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'baju mahal berkualitas','https://silvia2552.github.io/baju-mahal-berkualitas','GitHub Pages','Repo: baju-mahal-berkualitas');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://silvia2552.github.io/bunnysweatyshop')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'bunnysweatyshop','https://silvia2552.github.io/bunnysweatyshop','GitHub Pages','Repo: bunnysweatyshop');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://silvia2552.github.io/koreansweeties')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'koreansweeties','https://silvia2552.github.io/koreansweeties','GitHub Pages','Repo: koreansweeties');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://silvia2552.github.io/sweetyiess')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'sweetyiess','https://silvia2552.github.io/sweetyiess','GitHub Pages','Repo: sweetyiess');
  end if;
  -- Zsazsa Azalia Ar-ramadhani (6 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Zsazsa Azalia Ar-ramadhani','zsazsa-azalia-ar-ramadhani',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='zsazsa-azalia-ar-ramadhani' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zsazsacute698.github.io/makebasa')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'makebasa','https://zsazsacute698.github.io/makebasa','GitHub Pages','Repo: makebasa');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zsazsacute698.github.io/stylenuw')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'stylenuw','https://zsazsacute698.github.io/stylenuw','GitHub Pages','Repo: stylenuw');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zsazsacute698.github.io/zsazsacute698')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'zsazsacute698','https://zsazsacute698.github.io/zsazsacute698','GitHub Pages','Repo: zsazsacute698');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zsazsacute698.github.io/rebasa')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'rebasa','https://zsazsacute698.github.io/rebasa','GitHub Pages','Repo: rebasa');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zsazsacute698.github.io/nailbyzsa')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'nailbyzsa','https://zsazsacute698.github.io/nailbyzsa','GitHub Pages','Repo: nailbyzsa');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zsazsacute698.github.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Zsazsa Azalia Ar-ramadhani · Site','https://zsazsacute698.github.io','GitHub Pages','Repo: zsazsacute698.github.io');
  end if;
  -- Nazhifa Wardah Azizah (4 pages)
  insert into gallery_alumni(name,name_norm,angkatan_id,class_code,role) values ('Nazhifa Wardah Azizah','nazhifa-wardah-azizah',aid,'52','Alumni')
  on conflict (name_norm, angkatan_id) do update set class_code=excluded.class_code;
  select id into alid from gallery_alumni where name_norm='nazhifa-wardah-azizah' and angkatan_id=aid limit 1;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zhifa19.github.io/CodeByNazhifa')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'CodeByNazhifa','https://zhifa19.github.io/CodeByNazhifa','GitHub Pages','Repo: CodeByNazhifa');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zhifa19.github.io/Maison-ZHI')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Maison ZHI','https://zhifa19.github.io/Maison-ZHI','GitHub Pages','Repo: Maison-ZHI');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zhifa19.github.io/Lumbungbeku')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'Lumbungbeku','https://zhifa19.github.io/Lumbungbeku','GitHub Pages','Repo: Lumbungbeku');
  end if;
  if not exists (select 1 from gallery_websites where alumni_id=alid and lower(rtrim(url,'/'))=lower('https://zhifa19.github.io/zhifa19.ghitub.io')) then
    insert into gallery_websites(alumni_id,title,url,category,description) values (alid,'zhifa19.ghitub.io','https://zhifa19.github.io/zhifa19.ghitub.io','GitHub Pages','Repo: zhifa19.ghitub.io');
  end if;
end $$;
-- total page links: 298