import { queryKeys } from "@/lib/queryClient";
import {
  approveAnnotation,
  getAnnotationQueue,
  getAnnotationStats,
  relabelAnnotation,
  type AnnotationQueueParams,
  type DetectionStatus,
} from "@/services/annotationApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAnnotationQueue(params: AnnotationQueueParams = {}) {
  return useQuery({
    queryKey: queryKeys.annotations.queue(params),
    queryFn: () => getAnnotationQueue(params),
    placeholderData: (previous) => previous,
  });
}

export function useAnnotationStats() {
  return useQuery({
    queryKey: queryKeys.annotations.stats,
    queryFn: getAnnotationStats,
  });
}

/**
 * Item yang barusan disetujui/dilabeli hilang dari antrian, jadi queue +
 * counter keduanya perlu di-invalidate setelah mutation berhasil.
 */
function invalidateAnnotations(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: queryKeys.annotations.all });
}

export function useApproveAnnotation() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (detectionId: number) => approveAnnotation(detectionId),
    onSuccess: () => invalidateAnnotations(client),
  });
}

export function useRelabelAnnotation() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ detectionId, label }: { detectionId: number; label: DetectionStatus }) =>
      relabelAnnotation(detectionId, label),
    onSuccess: () => invalidateAnnotations(client),
  });
}
