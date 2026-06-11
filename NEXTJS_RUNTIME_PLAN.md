# Plan Perbaikan Error Next.js Runtime

## Ringkasan Masalah

Saat menjalankan `pnpm dev:web`, aplikasi gagal render route `/` dengan error:

`Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined`

Ada juga warning terpisah:

`The "middleware" file convention is deprecated. Please use "proxy" instead.`

## Temuan Awal

1. File `packages/web/src/app/(dashboard)/page.tsx` mengimpor `YoLandingPage` dari:
   `@/wgenie-cfo/components/landing-page`
2. File `packages/web/src/wgenie-cfo/components/landing-page.tsx` ternyata mengekspor:
   `WalletGenieLandingPage`
3. Artinya `YoLandingPage` bernilai `undefined`, dan itu sangat konsisten dengan error React di atas.
4. Warning middleware belum jadi penyebab crash utama, tetapi perlu dirapikan setelah runtime error selesai.

## Target

- Menghilangkan error render pada route `/`
- Memastikan tidak ada import/export mismatch lain di jalur render awal
- Mengurangi noise dari deprecation warning `middleware` -> `proxy`

## Rencana Eksekusi

### 1. Perbaiki mismatch export/import

- Ubah import di `packages/web/src/app/(dashboard)/page.tsx` agar sesuai dengan nama export yang benar.
- Pilihan yang paling aman:
  - ganti `YoLandingPage` menjadi `WalletGenieLandingPage`
  - atau buat alias export di file landing page jika konsistensi nama lama harus dipertahankan

### 2. Audit komponen yang dipakai di route awal

Fokus ke komponen yang dirender saat `/` dibuka:

- `packages/web/src/app/(dashboard)/layout.tsx`
- `packages/web/src/app/(dashboard)/page.tsx`
- `packages/web/src/components/sidebar/index.ts`
- `packages/web/src/components/sidebar/sidebar-layout.tsx`
- `packages/web/src/dashboard/dashboard-flow-chart.tsx`
- `packages/web/src/wgenie-cfo/components/landing-page.tsx`

Tujuannya:

- pastikan semua import named export benar
- pastikan tidak ada barrel export yang mengarah ke simbol non-eksisten
- pastikan komponen client/server boundary tetap valid

### 3. Cek apakah ada mismatch serupa di file lain

Cari pola yang sama pada folder `packages/web/src`:

- import nama lama yang tidak lagi diekspor
- komponen hasil barrel export yang ternyata tidak ada
- default export vs named export yang tertukar

Prioritas pengecekan:

- file `page.tsx` dan `layout.tsx`
- file barrel `index.ts`
- komponen yang dipanggil langsung dari route root

### 4. Tangani warning `middleware` deprecated

- Evaluasi migrasi dari `packages/web/src/middleware.ts` ke `proxy`
- Pastikan perilaku auth/session tetap sama setelah migrasi
- Jangan gabungkan perubahan proxy dengan perbaikan crash utama jika ingin debugging tetap terisolasi

### 5. Verifikasi

Setelah perbaikan:

- jalankan `pnpm dev:web`
- buka `/`
- pastikan tidak ada error render 500
- buka route lain yang memakai layout sidebar untuk memastikan tidak ada regresi
- cek console browser dan terminal untuk warning atau runtime error tambahan

## Kriteria Selesai

- Route `/` berhasil render tanpa `500`
- Tidak ada lagi error `Element type is invalid`
- Import di halaman root sudah konsisten dengan export aktual
- Warning `middleware` deprecated sudah ditangani atau dicatat sebagai follow-up teknis

## Catatan Teknis

- Root cause paling mungkin saat ini adalah mismatch `YoLandingPage` vs `WalletGenieLandingPage`
- Jika setelah perbaikan masih error, kandidat berikutnya adalah komponen dari barrel export `@/components/sidebar`
- Jangan menganggap warning `middleware` sebagai penyebab utama crash, karena itu hanya deprecation notice
