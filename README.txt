SHEILLA STORE - versi VERCEL

Isi:
- index.html, admin.html : tampilan toko & admin (tidak diubah)
- api/index.js           : server (versi Vercel, database pakai Upstash Redis)
- vercel.json            : pengaturan routing (/admin -> admin.html)
- package.json           : paket yang dibutuhkan

Langkah:
1. Upload semua isi folder ini ke repository GitHub baru.
2. Vercel > Add New > Project > Import repository tadi > Deploy
   (Framework Preset: Other, biarkan Build Command kosong).
3. Project > Storage > Create Database > Upstash Redis (Marketplace) > Connect ke project.
   Variabel KV_REST_API_URL & KV_REST_API_TOKEN terisi otomatis.
4. Project > Settings > Environment Variables, tambah:
   - ADMIN_PASSWORD = password admin kamu
   - SECRET = teks acak panjang (opsional tapi disarankan)
   - GOOGLE_CLIENT_ID (opsional, kalau pakai login Google)
5. Deployments > Redeploy.
6. Buka namasitus.vercel.app/admin.html

CATATAN: data lama di Netlify (member, saldo, transaksi) tidak ikut pindah.
