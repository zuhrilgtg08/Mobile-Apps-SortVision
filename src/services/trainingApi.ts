import { apiRequest } from "@/services/api";
import {
  buildQuery,
  type Envelope,
  type PageParams,
  type Paginated,
} from "@/services/types";

export type TrainingStatus =
  | "queued"
  | "exporting"
  | "training"
  | "completed"
  | "failed";

export type TrainingRun = {
  id: number;
  name: string;
  status: TrainingStatus;
  status_label: string;
  status_color: string;
  is_active: boolean;
  progress: number;
  current_epoch: number;
  epochs: number;
  /** mAP@50 pada skala 0–100 (bukan 0–1), atau null bila belum ada metrik. */
  map50: number | null;
  model_path: string | null;
  /** Run inilah yang modelnya sedang dipakai untuk inference. */
  is_active_model: boolean;
  dataset_train: number | null;
  dataset_val: number | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
};

/** Detail run menyertakan metrik mentah dari service ML. */
export type TrainingRunDetail = TrainingRun & {
  metrics: {
    map50?: number;
    per_class?: { label: string; precision?: number; recall?: number; f1?: number }[];
  } | null;
};

export type TrainingDataset = {
  approved_annotations: number;
  min_samples: number;
  can_start: boolean;
  has_active_run: boolean;
  per_class: { label: string; count: number }[];
};

export async function getTrainingRuns(
  params: PageParams = {},
): Promise<Paginated<TrainingRun>> {
  return apiRequest<Paginated<TrainingRun>>(
    `/training-runs${buildQuery({ page: params.page, per_page: params.per_page })}`,
  );
}

export async function getTrainingRun(id: number): Promise<TrainingRunDetail> {
  const response = await apiRequest<Envelope<TrainingRunDetail>>(
    `/training-runs/${id}`,
  );
  return response.data;
}

export async function getTrainingDataset(): Promise<TrainingDataset> {
  const response = await apiRequest<Envelope<TrainingDataset>>(
    "/training-runs/dataset",
  );
  return response.data;
}

/**
 * Memulai training baru.
 *
 * Backend menolak dengan status yang berbeda-beda dan pesannya sudah siap
 * tampil: `422` anotasi kurang, `503` ML service mati, `409` masih ada run
 * berjalan. Semuanya sampai ke pemanggil sebagai `ApiError`.
 */
export async function startTrainingRun(epochs: number): Promise<TrainingRun> {
  const response = await apiRequest<Envelope<TrainingRun>>("/training-runs", {
    method: "POST",
    body: { epochs },
  });
  return response.data;
}

export type ActivateModelResult = {
  message: string;
  active_training_run_id: number;
  /**
   * `false` berarti ML service sedang mati saat reload dicoba — bukan aktivasi
   * gagal. Setting di backend tetap tertulis.
   */
  ml_reloaded: boolean;
};

/**
 * Promosikan model sebuah run jadi model live inference.
 *
 * Backend menolak dengan `422` bila run belum selesai, tidak punya model, atau
 * mAP-nya di bawah ambang. `force` hanya melewati ambang mutu — bukan syarat
 * completed/model, karena memaksa run tanpa model tidak mengaktifkan apa pun.
 */
export async function activateTrainingModel(
  id: number,
  force = false,
): Promise<ActivateModelResult> {
  const response = await apiRequest<{
    message: string;
    data: { active_training_run_id: number; ml_reloaded: boolean };
  }>(`/training-runs/${id}/activate`, {
    method: "POST",
    body: force ? { force: true } : {},
  });

  return {
    message: response.message,
    active_training_run_id: response.data.active_training_run_id,
    ml_reloaded: response.data.ml_reloaded,
  };
}
