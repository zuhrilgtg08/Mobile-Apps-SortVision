# SortVision Mobile API Contract (Draft)

> Draft awal untuk diskusi bersama tim dashboard. Semua perubahan field atau endpoint harus dicatat di file ini agar menjadi acuan tunggal.

## Authentication

| Endpoint       | Method | Request body                              | Success response                                                                                 | Error codes                                |
| -------------- | ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `/auth/login`  | `POST` | `{ "email": string, "password": string }` | `{ "token": string, "user": { "id": number, "name": string, "email": string, "role": string } }` | `401 Unauthorized`, `422 Validation Error` |
| `/auth/logout` | `POST` | `Authorization: Bearer <token>`           | `{ "message": "Logged out" }`                                                                    | `401 Unauthorized`                         |
| `/auth/me`     | `GET`  | `Authorization: Bearer <token>`           | `{ "user": { "id": number, "name": string, "email": string, "role": string } }`                  | `401 Unauthorized`                         |

### Register & reset password (usulan/belum diimplementasikan backend)

> Ketiga endpoint di bawah BELUM ada di `routes/api.php` backend (yang tersedia baru
> `login`/`logout`/`me`). Registrasi & reset password saat ini hanya ada di web
> dashboard lewat Livewire/Breeze, bukan REST.
>
> Sampai backend menambahkannya, mobile menangani `404`/`501` dengan melempar
> `AuthEndpointUnavailableError` dan menampilkan pesan "belum tersedia di server".
> Yang penting: layar TIDAK BOLEH menampilkan sukses palsu — bug lama membuat
> layar daftar memanggil `/auth/login` dan layar reset hanya mengubah state lokal,
> sehingga user mengira akun/password sudah dibuat padahal tidak ada apa pun yang
> berubah di server.

| Endpoint                 | Method | Request body                                                                                          | Success response                                              | Error codes                                                                  |
| ------------------------ | ------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/auth/register`         | `POST` | `{ "name": string, "email": string, "password": string, "password_confirmation": string }`            | `{ "token"?: string, "user": { ... } }`                       | `404`/`501` (belum ada), `422 Validation Error`                              |
| `/auth/forgot-password`  | `POST` | `{ "email": string }`                                                                                 | `{ "message": string }`                                       | `404`/`501` (belum ada), `422 Validation Error`                              |
| `/auth/reset-password`   | `POST` | `{ "token": string, "email": string, "password": string, "password_confirmation": string }`           | `{ "message": string }`                                       | `404`/`501` (belum ada), `422 Validation Error`                              |

- `/auth/register` — kalau backend mengembalikan `token`, mobile langsung menyimpan sesi
  dan masuk ke dashboard. Kalau hanya membuat akun tanpa token, mobile mengarahkan
  user ke layar login. Kedua perilaku sudah didukung.
- `/auth/reset-password` — `token` diambil dari deep link email reset
  (`sortvision://reset-password?token=...&email=...`). Tanpa token, layar reset
  menolak submit dan meminta user membuka link dari email.

### Error validasi (`422`)

Mobile membaca format bawaan Laravel dan memetakannya ke error per-field di form:

```jsonc
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email has already been taken."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

## Status & Monitoring

| Endpoint      | Method | Request body | Success response                                                                                                          | Error codes                                     |
| ------------- | ------ | ------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `/status`     | `GET`  | none         | `{ "status": "online" \| "offline", "mqtt_connected": boolean, "app_name": string, "timezone": string, "timestamp": string }` | `401 Unauthorized`, `500 Internal Server Error` |
| `/detections` | `GET`  | none         | `[DetectionItem]` **atau** `{ "data": [DetectionItem] }` (mobile menormalkan keduanya)                                     | `401 Unauthorized`                              |
| `/arm`        | `GET`  | none         | `ArmResponse` (lihat di bawah)                                                                                            | `401 Unauthorized`                              |

### `DetectionItem` (model `Detection` backend)

```jsonc
{
  "code": string | null,
  "product_id": number | null,
  "camera": string | null,
  "conveyor": string | null,
  "status": string | null,     // mis. "passed" | "damaged" | "scratched"
  "qr_value": string | null,
  "confidence": number | null,
  "bbox": [x1, y1, x2, y2] | null, // koordinat piksel frame ASLI (lihat Live Camera)
  "label": string | null,
  "frame_width": number | null,
  "frame_height": number | null,
  "detected_at": string | null // ISO 8601
}
```

`GET /detections` menerima query `camera`, `status`, dan `per_page`.

### `ArmResponse` (`GET /arm`, ArmController backend)

```jsonc
{
  "state": "idle" | "running" | "error",
  "state_label": string,
  "detail": string | null,
  "last_command": unknown,                       // payload command terakhir
  "telemetry": { [key: string]: unknown } | null, // snapshot dari arm/status
  "reported_at": string | null                   // ISO 8601
}
```

> Field pasti dari `/status` dan `/arm` harus diverifikasi dari response asli saat testing
> manual — update tabel/skema di atas jika backend berbeda.

## CRUD Resources (Fase 1 — SUDAH ada di backend)

Semua endpoint di bawah butuh `Authorization: Bearer <token>` dan mengembalikan
amplop yang sama untuk list:

```jsonc
{
  "data": [ /* item */ ],
  "meta": { "current_page": 1, "per_page": 20, "total": 42, "last_page": 3 }
}
```

Detail tunggal & hasil create/update dibungkus `{ "message"?: string, "data": {...} }`.
Query `per_page` berlaku di semua list (default 20, maksimum 100).

| Endpoint                            | Method            | Query / Body                                                       | Catatan                                                             |
| ----------------------------------- | ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `/products`                         | `GET`             | `search`, `status`, `category_id`, `per_page`                       | `status` ∈ `active\|inactive\|archived`                              |
| `/products`                         | `POST`            | `name*`, `status*`, `stock*`, `category_id`, `description`, `image` | `code` & `sku` digenerate server; QR otomatis dibuat                 |
| `/products/{id}`                    | `GET`             | —                                                                    |                                                                       |
| `/products/{id}`                    | `PUT`/`PATCH`     | sama seperti POST                                                    | `code` & `sku` TIDAK pernah berubah                                   |
| `/products/{id}`                    | `DELETE`          | —                                                                    | ikut menghapus file gambar & QR                                       |
| `/categories`                       | `GET`             | `search`, `is_active`, `per_page`                                    |                                                                       |
| `/categories`                       | `POST`            | `name*`, `sort_order*`, `description`, `is_active`, `image`          | `slug` diturunkan dari `name`                                         |
| `/categories/{id}`                  | `GET`/`PUT`/`DELETE` | —                                                                 | `name` unik                                                           |
| `/users`                            | `GET`             | `search`, `role`, `per_page`                                         | hash password tidak pernah dikirim                                    |
| `/users`                            | `POST`            | `name*`, `email*`, `role*`, `password*`, `title`, `is_active`, `avatar` |                                                                    |
| `/users/{id}`                       | `PUT`/`DELETE`    | `password` opsional saat update                                      | admin terakhir tidak bisa diturunkan/dinonaktifkan/dihapus (`422`)    |
| `/roles`                            | `GET`             | —                                                                    | `{ roles, modules, access_levels, matrix }`                           |
| `/roles`                            | `PUT`             | `permissions[]: {role, module, access}`                              |                                                                       |
| `/training-runs`                    | `GET`             | `per_page`                                                           |                                                                       |
| `/training-runs/dataset`            | `GET`             | —                                                                    | `{ approved_annotations, min_samples, can_start, has_active_run }`    |
| `/training-runs/{id}`               | `GET`             | —                                                                    | menyertakan `metrics` mentah (skala 0–100)                            |
| `/training-runs`                    | `POST`            | `epochs*` (1–20)                                                     | `422` sampel kurang, `503` ML offline, `409` sudah ada run berjalan   |
| `/logs`                             | `GET`             | `level`, `source`, `search`, `per_page`                              | terbaru dulu                                                          |
| `/logs/filters`                     | `GET`             | —                                                                    | opsi filter, jangan hard-code di mobile                               |
| `/settings`                         | `GET`             | —                                                                    | singleton                                                             |
| `/settings`                         | `PUT`/`PATCH`     | kirim hanya key yang berubah                                         | update parsial; `confidence_threshold` 0.5–1                          |
| `/returns`                          | `GET`             | `status`, `conveyor`, `per_page`                                     | `status` ∈ `open\|resolved`                                           |
| `/returns/{id}`                     | `GET`             | —                                                                    | menyertakan `detections[]`                                            |
| `/returns/{id}/resolve`             | `POST`            | `notes`                                                              | `409` kalau sudah resolved                                            |

`*` = wajib. Upload gambar (`image`/`avatar`) dikirim sebagai `multipart/form-data`, maks 2 MB.

### Hak akses per role (`403`)

Berbeda dari dashboard web — di mana matriks role hanya informatif — **API mobile
benar-benar menegakkan matriks `RolePermission`**. Endpoint baca butuh akses
`r`/`w`/`f`, endpoint tulis butuh `w`/`f`. Kalau ditolak, response `403`:

```jsonc
{ "message": "Anda tidak memiliki akses untuk tindakan ini.", "module": "Product", "required": "write" }
```

Ringkasan matriks bawaan (`RolePermission::defaults()`):

| Role            | Product | Categories | Users | Returns | Training | Logs | Settings |
| --------------- | ------- | ---------- | ----- | ------- | -------- | ---- | -------- |
| `admin`         | full    | full       | full  | full    | full     | full | full     |
| `supervisor_qc` | write   | write      | read  | full    | write    | read | read     |
| `operator`      | read    | —          | —     | write   | read     | read | —        |
| `viewer`        | read    | —          | —     | read    | —        | read | —        |

Akun dengan `is_active = false` mendapat `403` di semua endpoint meski token masih valid.

## Live Camera (Fase 2 — SUDAH ada di backend)

| Endpoint           | Method | Query        | Success response                                                       |
| ------------------ | ------ | ------------ | ---------------------------------------------------------------------- |
| `/cameras`         | `GET`  | `is_active`, `per_page` | `{data: [Camera], meta}`                                    |
| `/cameras/status`  | `GET`  | —            | `{data: {connected, mode, fps, service_reachable}}`                     |
| `/cameras/frame`   | `GET`  | —            | **`image/jpeg`** (bukan JSON), atau `503` bila belum ada frame          |

`Camera`: `{id, name, conveyor, is_active, position, is_live, source_kind}`.
`source_kind` ∈ `rtsp \| simulator`.

> **`rtsp_url` sengaja TIDAK dikirim.** URL RTSP sering memuat kredensial
> (`rtsp://user:pass@host`) dan klien tidak pernah membutuhkannya — frame datang
> lewat proxy `/cameras/frame`.

### Kenapa polling frame, bukan MJPEG

ml-service punya `/camera/stream` berformat `multipart/x-mixed-replace`, dan
dashboard web memakainya langsung di `<img>`. **Itu tidak bisa dipakai di
mobile**: image loader native iOS/Android tidak merender MJPEG — hasilnya layar
kosong, bukan error. Selain itu ml-service tidak punya autentikasi sendiri dan
biasanya hanya mendengarkan di localhost, sehingga ponsel tidak bisa
menjangkaunya.

Karena itu backend menambahkan `GET /camera/frame` di ml-service (satu JPEG) dan
mem-proxy-nya lewat `/cameras/frame` yang dijaga token Sanctum. Mobile memanggil
endpoint itu berulang (1/2/5/10 fps, bisa dipilih user) untuk membentuk feed.
Query `?t=<timestamp>` wajib ada — tanpa cache-busting gambar akan membeku.

### Bounding box pada `/detections`

`DetectionItem` kini juga membawa:

```jsonc
{
  "bbox": [x1, y1, x2, y2] | null,  // koordinat piksel frame ASLI
  "label": string | null,
  "frame_width": number | null,
  "frame_height": number | null
}
```

`bbox` memakai koordinat frame asli, jadi klien **wajib** menskalakannya dengan
`frame_width`/`frame_height` terhadap ukuran render di layar. Deteksi dari jalur
manual (webcam) tidak punya kotak dan `bbox`-nya `null` — jangan digambar di
posisi tebakan.

`GET /detections` juga menerima filter `?camera=<nama>`.

## Arm Command (Fase 3 — SUDAH ada di backend)

> Command TIDAK dipublish langsung oleh mobile ke broker MQTT. Backend tetap
> satu-satunya publisher `arm/command`, karena resolusi `TargetZonePreset`
> (kategori → `joint_angles`) ada di `ArmMqttService::buildCommandPayload` (Laravel).

| Endpoint       | Method | Request body                                                    | Success response                          |
| -------------- | ------ | ----------------------------------------------------------------- | ----------------------------------------- |
| `/arm/command` | `POST` | `{ "category": string, "context"?: { [key: string]: unknown } }` | `{ "message": string, "command": { "category": string, "zone": string, "joint_angles": number[], "issued_at": string } }` |

**Kode error — masing-masing berarti hal berbeda:**

| Status | Arti                                                                 | Tindakan klien                              |
| ------ | -------------------------------------------------------------------- | ------------------------------------------- |
| `401`  | Token kadaluarsa                                                      | Kembali ke login                            |
| `403`  | Role tidak punya akses **write** pada modul "Live Camera", atau akun nonaktif | Tampilkan "tidak punya akses", jangan retry |
| `422`  | `category`/`context` tidak valid, **atau** kategori tidak punya preset zona (dan preset `default` tidak tersedia sebagai fallback) | Perbaiki input / hubungi admin untuk seed preset |
| `429`  | Melebihi batas 30 command per menit                                   | Tunggu, lalu coba lagi                      |
| `503`  | Broker MQTT tidak terjangkau (preset sudah resolve, publish MQTT-nya yang gagal) | Boleh dicoba lagi                           |

Catatan penting soal `category`: `TargetZonePreset::forCategory()` jatuh ke
preset `default` bila kategori tidak dikenal, jadi kategori asing **tetap
diterima** dan diarahkan ke zona default — bukan ditolak `422` — selama
preset `default` sudah di-seed. Jangan asumsikan `200` berarti kategorinya
punya preset khusus.

`command.zone`/`command.joint_angles` adalah preset yang benar-benar dipakai
(hasil resolve `TargetZonePreset::forCategory()`), dipakai mobile untuk
menampilkan konfirmasi zona/sudut sendi ke operator tanpa request terpisah.

Backend menambahkan `source: "mobile"` dan `issued_by: <user id>` ke `context`
sebelum publish, dan mencatat setiap command yang diterima ke system log
(`source: "arm"`) supaya gerakan fisik bisa dilacak ke akun pemesannya.

## MQTT (telemetry realtime, opsional)

- Mobile boleh SUBSCRIBE (read-only) `arm/status` dan `arm/detection` via MQTT-over-WebSocket
  jika `EXPO_PUBLIC_MQTT_WS_URL` diset. Kalau kosong, mobile hanya polling REST.
- Mobile TIDAK PERNAH publish ke topik arm mana pun.
- Base topic dapat diubah lewat `EXPO_PUBLIC_MQTT_BASE_TOPIC` (default `arm`).

## Notes

- Semua request yang memerlukan autentikasi wajib mengirim header `Authorization: Bearer <token>`.
- Ketika server merespons `401`, aplikasi mobile wajib membersihkan sesi lokal dan mengarahkan pengguna kembali ke halaman login.
- Jika ada perubahan skema respon atau field, update file ini sebelum mengubah kode mobile.
