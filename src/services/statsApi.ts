import { apiRequest } from "@/services/api";
import { buildQuery } from "@/services/types";

/** Jendela waktu yang diterima backend (`StatsController::RANGES`). */
export type StatsRange = "today" | "7d" | "30d";

export type DashboardStats = {
  total: number;
  passed: number;
  /** Persentase 0–100, sudah dibulatkan 1 desimal oleh backend. */
  pass_rate: number;
  unreadable: number;
  defective: number;
  returned: number;
  /**
   * Item per menit dalam 60 menit terakhir. Sengaja TIDAK mengikuti `range` —
   * angka ini menggambarkan kondisi line saat ini, bukan periode yang dipilih.
   */
  throughput_per_minute: number;
  active_cameras: number;
};

/** Satu batang pada grafik distribusi status. */
export type DistributionSlice = {
  key: string;
  label: string;
  /** Nama warna Tailwind dari `Detection::STATUSES` (mis. "green", "amber"). */
  color: string;
  count: number;
  pct: number;
};

/** Satu bucket waktu pada grafik tren. */
export type TrendBucket = {
  label: string;
  total: number;
  passed: number;
  failed: number;
};

export type DashboardStatsResponse = {
  range: StatsRange;
  stats: DashboardStats;
  /** Selalu memuat semua status, termasuk yang bernilai 0. */
  distribution: DistributionSlice[];
  /** Selalu bersumbu waktu rata: 24 bucket jam-an, atau 7/30 bucket harian. */
  trend: TrendBucket[];
  generated_at: string;
};

export async function getDashboardStats(
  range: StatsRange = "today",
): Promise<DashboardStatsResponse> {
  return apiRequest<DashboardStatsResponse>(
    `/stats/dashboard${buildQuery({ range })}`,
  );
}
