# SortVision Mobile API Contract (Draft)

> Draft awal untuk diskusi bersama tim dashboard. Semua perubahan field atau endpoint harus dicatat di file ini agar menjadi acuan tunggal.

## Authentication

| Endpoint       | Method | Request body                              | Success response                                                                                 | Error codes                                |
| -------------- | ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `/auth/login`  | `POST` | `{ "email": string, "password": string }` | `{ "token": string, "user": { "id": number, "name": string, "email": string, "role": string } }` | `401 Unauthorized`, `422 Validation Error` |
| `/auth/logout` | `POST` | `Authorization: Bearer <token>`           | `{ "message": "Logged out" }`                                                                    | `401 Unauthorized`                         |
| `/auth/me`     | `GET`  | `Authorization: Bearer <token>`           | `{ "user": { "id": number, "name": string, "email": string, "role": string } }`                  | `401 Unauthorized`                         |

## Status & Monitoring

| Endpoint      | Method | Request body | Success response                              | Error codes                                     |
| ------------- | ------ | ------------ | --------------------------------------------- | ----------------------------------------------- |
| `/status`     | `GET`  | none         | `{ "status": "online", "timestamp": string }` | `401 Unauthorized`, `500 Internal Server Error` |
| `/detections` | `GET`  | none         | `{ "data": [] }`                              | `401 Unauthorized`                              |
| `/arm`        | `GET`  | none         | `{ "state": "idle" }`                         | `401 Unauthorized`                              |

## Notes

- Semua request yang memerlukan autentikasi wajib mengirim header `Authorization: Bearer <token>`.
- Ketika server merespons `401`, aplikasi mobile wajib membersihkan sesi lokal dan mengarahkan pengguna kembali ke halaman login.
- Jika ada perubahan skema respon atau field, update file ini sebelum mengubah kode mobile.
