
-- Hapus kata "Domain" dari judul website
update gallery_websites
set title = trim(both from regexp_replace(title, '\s*[·•\-–|]\s*Domain\s*$', '', 'i'))
where title ~* 'Domain';

update gallery_websites
set title = trim(both from regexp_replace(title, '\bDomain\b', '', 'gi'))
where title ~* 'Domain';
