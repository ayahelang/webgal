-- Hapus website ganda di database (URL sama per alumni, ignore trailing slash & case)
DELETE FROM gallery_websites a
USING gallery_websites b
WHERE a.ctid > b.ctid
  AND a.alumni_id = b.alumni_id
  AND lower(rtrim(a.url, '/')) = lower(rtrim(b.url, '/'));

-- Opsional: hapus baris URL kosong
DELETE FROM gallery_websites WHERE url IS NULL OR trim(url) = '';
