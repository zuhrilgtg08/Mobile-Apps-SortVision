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
  "status": string | null,     // mis. "pass" | "fail" | "reject"
  "qr_value": string | null,
  "confidence": number | null, // 0..1
  "detected_at": string | null // ISO 8601
}
```

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

## Arm Command (usulan/belum diimplementasikan backend)

> Endpoint ini BELUM ada di `routes/api.php` backend (baru ada GET untuk
> `status`/`detections`/`arm`). Didokumentasikan sebagai usulan kontrak supaya mobile
> siap begitu backend menambahkannya. Sampai ada, mobile menangani `404`/`501`
> dengan pesan ramah user ("Fitur kirim command belum tersedia di server"), bukan crash.
>
> Command TIDAK dipublish langsung oleh mobile ke broker MQTT. Backend tetap
> satu-satunya publisher `arm/command`, karena resolusi `TargetZonePreset`
> (kategori → `joint_angles`) ada di `ArmMqttService::buildCommandPayload` (Laravel).

| Endpoint       | Method | Request body                                                       | Success response                                | Error codes                                                              |
| -------------- | ------ | ----------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| `/arm/command` | `POST` | `{ "category": string, "context"?: { [key: string]: unknown } }` | `{ "message"?: string, "command"?: unknown }`   | `401 Unauthorized`, `404 Not Found` / `501 Not Implemented` (belum ada), `422 Validation Error` |

## MQTT (telemetry realtime, opsional)

- Mobile boleh SUBSCRIBE (read-only) `arm/status` dan `arm/detection` via MQTT-over-WebSocket
  jika `EXPO_PUBLIC_MQTT_WS_URL` diset. Kalau kosong, mobile hanya polling REST.
- Mobile TIDAK PERNAH publish ke topik arm mana pun.
- Base topic dapat diubah lewat `EXPO_PUBLIC_MQTT_BASE_TOPIC` (default `arm`).

## Notes

- Semua request yang memerlukan autentikasi wajib mengirim header `Authorization: Bearer <token>`.
- Ketika server merespons `401`, aplikasi mobile wajib membersihkan sesi lokal dan mengarahkan pengguna kembali ke halaman login.
- Jika ada perubahan skema respon atau field, update file ini sebelum mengubah kode mobile.
