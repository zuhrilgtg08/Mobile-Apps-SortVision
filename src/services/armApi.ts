import { ApiError, apiRequest } from "@/services/api";

/** State arm yang mungkin dilaporkan backend (ArmController / model ArmStatus). */
export type ArmState = "idle" | "running" | "error";

/**
 * Response dari `GET /arm` (ArmController backend).
 * `telemetry`/`last_command` sengaja longgar (`unknown`) karena bentuknya
 * ditentukan payload MQTT `arm/status` yang ditulis backend, bukan kontrak tetap.
 */
export type ArmResponse = {
  state: ArmState;
  state_label: string;
  detail: string | null;
  last_command: unknown;
  telemetry: Record<string, unknown> | null;
  reported_at: string | null;
};

export type ArmCommandRequest = {
  category: string;
  context?: Record<string, unknown>;
};

export type ArmCommandResponse = {
  message?: string;
  command?: unknown;
};

/** Error khusus supaya UI bisa membedakan "belum ada endpoint" dari error lain. */
export class ArmCommandUnavailableError extends Error {
  constructor(message = "Fitur kirim command belum tersedia di server.") {
    super(message);
    this.name = "ArmCommandUnavailableError";
  }
}

export async function getArmState(): Promise<ArmResponse> {
  return apiRequest<ArmResponse>("/arm");
}

/**
 * Mengirim command ke backend (`POST /arm/command`) — endpoint USULAN yang
 * belum diimplementasikan backend saat ini (lihat `API_CONTRACT.md`).
 * Backend tetap satu-satunya publisher `arm/command`; mobile TIDAK publish MQTT.
 *
 * Jika backend membalas 404/501 (belum ada), melempar `ArmCommandUnavailableError`
 * dengan pesan yang bisa ditampilkan langsung ke user — bukan crash.
 */
export async function sendArmCommand(
  category: string,
  context?: Record<string, unknown>,
): Promise<ArmCommandResponse> {
  try {
    return await apiRequest<ArmCommandResponse>("/arm/command", {
      method: "POST",
      body: { category, context } satisfies ArmCommandRequest,
    });
  } catch (error) {
    // Endpoint belum ada di backend → backend balas 404/501. Terjemahkan jadi
    // error yang ramah UI, bukan crash.
    if (error instanceof ApiError && (error.status === 404 || error.status === 501)) {
      throw new ArmCommandUnavailableError();
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
