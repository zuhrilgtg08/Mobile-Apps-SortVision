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
  code: string | null;
  product_id: number | null;
  camera: string | null;
  conveyor: string | null;
  status: string | null;
  qr_value: string | null;
  confidence: number | null;
  detected_at: string | null;
};

type DetectionsResponse = DetectionItem[] | { data: DetectionItem[] };

export async function getStatus(): Promise<StatusResponse> {
  return apiRequest<StatusResponse>("/status");
}

/**
 * Mengembalikan array deteksi apa pun bentuk pembungkus dari backend
 * (`[...]` langsung atau `{ data: [...] }`).
 */
export async function getDetections(): Promise<DetectionItem[]> {
  const payload = await apiRequest<DetectionsResponse>("/detections");
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload?.data ?? [];
}
