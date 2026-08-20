# SIM SATRIA — Class Builder

Google Apps Script web app builder untuk sistem sekolah multi-kelas berbasis Google Spreadsheet.

## Prinsip
- Seluruh konfigurasi MASTER dikelola dari frontend.
- `MASTER_USERS` menjadi sumber akun, role, dan pemetaan kelas.
- Owner adalah satu-satunya role yang boleh mengubah MASTER.
- Admin kelas hanya mengelola users/siswa pada kelas yang menjadi kewenangannya.
- Setiap kelas memiliki spreadsheet tab sendiri.
- Schema bersifat idempotent: kolom dicek berdasarkan `column_id` dan ditambahkan jika belum ada.
- Menu pada `index.html` dikendalikan oleh konfigurasi menu di MASTER melalui CRUD owner.
- Gateway tidak diperlukan untuk login; autentikasi aplikasi menggunakan MASTER USERS.

## Deploy
1. Buat project Google Apps Script.
2. Masukkan file `.gs` dan `Index.html` dari repository ini.
3. Jalankan `bootstrapSystem()` sekali sebagai owner.
4. Deploy sebagai Web App: **Execute as: Me**, **Who has access: Anyone**.
5. Buka web app dan login menggunakan akun yang tercatat di `MASTER_USERS`.

## Catatan keamanan
Password aplikasi disimpan sebagai hash SHA-256, bukan plaintext. Jangan gunakan password Google pada tabel MASTER.
