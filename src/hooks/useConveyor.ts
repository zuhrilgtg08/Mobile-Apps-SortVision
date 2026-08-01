import { queryKeys } from "@/lib/queryClient";
import {
  getConveyorAlerts,
  getConveyorStatus,
  sendConveyorCommand,
  type ConveyorAlertParams,
  type ConveyorCommand,
} from "@/services/conveyorApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Sebuah macet harus terlihat cepat, tapi status conveyor menyentuh broker MQTT
 * di tiap pemanggilan — 15 detik cukup responsif tanpa mengetuk broker terus
 * menerus.
 */
const STATUS_POLL_MS = 15_000;

export function useConveyorStatus() {
  return useQuery({
    queryKey: queryKeys.conveyor.status,
    queryFn: getConveyorStatus,
    refetchInterval: STATUS_POLL_MS,
  });
}

export function useConveyorAlerts(params: ConveyorAlertParams = {}) {
  return useQuery({
    queryKey: queryKeys.conveyor.alerts(params),
    queryFn: () => getConveyorAlerts(params),
    placeholderData: (previous) => previous,
  });
}

export function useConveyorCommand() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      command,
      speed_rpm,
    }: {
      command: ConveyorCommand;
      speed_rpm?: number;
    }) => sendConveyorCommand(command, speed_rpm !== undefined ? { speed_rpm } : {}),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.conveyor.all });
    },
  });
}
