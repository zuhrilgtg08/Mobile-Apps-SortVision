import { apiRequest } from "@/services/api";
import { buildQuery, type Paginated } from "@/services/types";

/** Sama dengan `ConveyorService::EVENTS` di backend. */
export type ConveyorEvent = "jam" | "off_flow";

/** Sama dengan `ConveyorService::COMMANDS`. */
export type ConveyorCommand = "start" | "stop" | "reverse" | "speed";

/**
 * Anomali conveyor. Di backend ini sebenarnya baris `SystemLog`
 * (`source = 'conveyor'`), bukan tabel sendiri — `event`/`conveyor` dinaikkan
 * jadi field, sisa `context` masuk ke `metrics`.
 */
export type ConveyorAlert = {
  id: number;
  level: string;
  message: string;
  event: ConveyorEvent | null;
  conveyor: string | null;
  metrics: Record<string, unknown>;
  logged_at: string | null;
};

export type ConveyorStatus = {
  broker_connected: boolean;
  commands: ConveyorCommand[];
  events: ConveyorEvent[];
  window_hours: number;
  /** Jumlah per jenis event, dibatasi `window_hours` terakhir. */
  counts: Record<string, number>;
  total_alerts: number;
  /** Tidak dibatasi window — ini kondisi terakhir yang diketahui. */
  latest_alert: ConveyorAlert | null;
};

export type ConveyorAlertParams = {
  event?: ConveyorEvent;
  page?: number;
  per_page?: number;
};

export async function getConveyorStatus(): Promise<ConveyorStatus> {
  const response = await apiRequest<{ data: ConveyorStatus }>("/conveyor/status");
  return response.data;
}

export async function getConveyorAlerts(
  params: ConveyorAlertParams = {},
): Promise<Paginated<ConveyorAlert>> {
  return apiRequest<Paginated<ConveyorAlert>>(
    `/conveyor/alerts${buildQuery({
      event: params.event,
      page: params.page,
      per_page: params.per_page,
    })}`,
  );
}

/**
 * Kirim perintah kontrol ke line.
 *
 * Backend membalas `503` kalau broker MQTT mati — bukan diam-diam sukses — jadi
 * kegagalan sampai ke pemanggil sebagai `ApiError` yang layak ditawari retry.
 */
export async function sendConveyorCommand(
  command: ConveyorCommand,
  options: { speed_rpm?: number; line?: string } = {},
): Promise<string> {
  const response = await apiRequest<{ message: string }>("/conveyor/command", {
    method: "POST",
    body: { command, ...options },
  });
  return response.message;
}
