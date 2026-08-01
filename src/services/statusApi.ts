import { apiRequest } from "@/services/api";

/**
 * Response dari `GET /status` (StatusController backend).
 * Mengikuti `API_CONTRACT.md` + field yang dikembalikan backend Laravel.
 */
export type StatusResponse = {
  status: "online" | "offline";
  mqtt_connected: boolean;
  app_name: string;
  timezone: string;
  timestamp: string;
};

/**
 * Satu baris deteksi (model `Detection` di backend). Backend bisa membungkus
 * array ini di dalam `{ data: [...] }` (lihat draft `API_CONTRACT.md`), jadi
 * konsumen sebaiknya lewat `getDetections()` yang sudah menormalkan bentuknya.
 */
export type DetectionItem = {
  id?: number;
  code: string | null;
  product_id: number | null;
  camera: string | null;
  conveyor: string | null;
  status: string | null;
  status_label?: string;
  qr_value: string | null;
  confidence: number | null;
  /**
   * Kotak yang menghasilkan verdict ini, `[x1, y1, x2, y2]` dalam koordinat
   * piksel frame ASLI — bukan koordinat layar. Untuk menggambarnya di atas
   * frame yang dirender pada ukuran lain, skalakan dengan
   * `frame_width`/`frame_height`. Null bila deteksi datang dari jalur manual
   * yang tidak mengirim kotak.
   */
  bbox?: [number, number, number, number] | null;
  label?: string | null;
  frame_width?: number | null;
  frame_height?: number | null;
  detected_at: string | null;
};

type DetectionsResponse = DetectionItem[] | { data: DetectionItem[] };

export type DetectionQuery = {
  camera?: string;
  status?: string;
  per_page?: number;
};

export async function getStatus(): Promise<StatusResponse> {
  return apiRequest<StatusResponse>("/status");
}

/**
 * Mengembalikan array deteksi apa pun bentuk pembungkus dari backend
 * (`[...]` langsung atau `{ data: [...] }`).
 */
export async function getDetections(
  query: DetectionQuery = {},
): Promise<DetectionItem[]> {
  const params: string[] = [];
  if (query.camera) params.push(`camera=${encodeURIComponent(query.camera)}`);
  if (query.status) params.push(`status=${encodeURIComponent(query.status)}`);
  if (query.per_page) params.push(`per_page=${query.per_page}`);
  const suffix = params.length > 0 ? `?${params.join("&")}` : "";

  const payload = await apiRequest<DetectionsResponse>(`/detections${suffix}`);
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload?.data ?? [];
}
