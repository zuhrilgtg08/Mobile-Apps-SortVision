import { queryKeys } from "@/lib/queryClient";
import { getDashboardStats, type StatsRange } from "@/services/statsApi";
import { useQuery } from "@tanstack/react-query";

/**
 * Angka agregat dashboard. Di-refetch berkala karena line terus berjalan —
 * 30 detik cukup rapat untuk terasa hidup tanpa membanjiri backend dengan
 * query agregat yang menyapu tabel deteksi.
 */
export function useDashboardStats(range: StatsRange = "today") {
  return useQuery({
    queryKey: queryKeys.stats.dashboard(range),
    queryFn: () => getDashboardStats(range),
    refetchInterval: 30_000,
    // Tahan data lama saat ganti range supaya kartu tidak berkedip kosong.
    placeholderData: (previous) => previous,
  });
}
