import { apiRequest } from "@/services/api";
import { type Product } from "@/services/productApi";

/** Verdict QC terakhir untuk produk yang discan. */
export type ScanDetection = {
  id: number;
  code: string | null;
  status: string;
  status_label: string;
  status_color: string;
  camera: string | null;
  conveyor: string | null;
  confidence: string | null;
  detected_at: string | null;
};

export type ScanResult = {
  product: Product;
  /** `null` bila produk belum pernah melewati QC. */
  latest_detection: ScanDetection | null;
};

/**
 * Terjemahkan hasil baca kamera jadi produk + verdict QC terakhirnya.
 *
 * Nilai mentah dikirim apa adanya: backend (`Product::resolveByQrValue`) yang
 * memutuskan apakah itu URL publik `/p/{token}`, token telanjang, atau payload
 * lama `SORTVISION|code|sku`. Parsing sengaja tidak diduplikasi di klien supaya
 * QR lama tidak berhenti bekerja hanya di aplikasi mobile.
 *
 * Melempar `ApiError` 404 kalau QR-nya tidak dikenali.
 */
export async function scanQr(qrValue: string): Promise<ScanResult> {
  const response = await apiRequest<{ data: ScanResult }>("/products/scan", {
    method: "POST",
    body: { qr_value: qrValue },
  });
  return response.data;
}
