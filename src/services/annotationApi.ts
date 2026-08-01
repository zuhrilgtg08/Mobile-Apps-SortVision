import { apiRequest } from "@/services/api";
import { buildQuery, type Paginated } from "@/services/types";

/** Sama dengan `Detection::STATUSES` di backend. */
export type DetectionStatus =
  | "passed"
  | "unreadable"
  | "damaged"
  | "scratched"
  | "returned"
  | "recheck";

export type AnnotationQueueItem = {
  id: number;
  code: string | null;
  status: DetectionStatus;
  status_label: string;
  status_color: string;
  product: { id: number; name: string; code: string } | null;
  image_url: string | null;
  confidence: string | null;
  detected_at: string | null;
};

export type AnnotationStats = {
  pending: number;
  labelled: number;
};

export type AnnotationQueueParams = {
  status?: DetectionStatus;
  page?: number;
  per_page?: number;
};

export async function getAnnotationQueue(
  params: AnnotationQueueParams = {},
): Promise<Paginated<AnnotationQueueItem>> {
  return apiRequest<Paginated<AnnotationQueueItem>>(
    `/annotations/queue${buildQuery({
      status: params.status,
      page: params.page,
      per_page: params.per_page,
    })}`,
  );
}

export async function getAnnotationStats(): Promise<AnnotationStats> {
  const response = await apiRequest<{ data: AnnotationStats }>(
    "/annotations/stats",
  );
  return response.data;
}

/**
 * Setujui label AI (status deteksi itu sendiri) sebagai ground truth. Backend
 * menolak dengan `422` bila statusnya bukan kelas visual (mis. "returned")
 * atau deteksinya tidak punya gambar sama sekali — keduanya sampai sebagai
 * `ApiError`.
 */
export async function approveAnnotation(detectionId: number): Promise<string> {
  const response = await apiRequest<{ message: string }>(
    `/annotations/${detectionId}/approve`,
    { method: "POST" },
  );
  return response.message;
}

/** Koreksi label ke kelas lain. `label` harus salah satu kelas trainable. */
export async function relabelAnnotation(
  detectionId: number,
  label: DetectionStatus,
): Promise<string> {
  const response = await apiRequest<{ message: string }>(
    `/annotations/${detectionId}/relabel`,
    { method: "POST", body: { label } },
  );
  return response.message;
}
