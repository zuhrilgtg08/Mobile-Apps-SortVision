import { ApiError, apiRequest } from '@/services/api';

export type ArmState = 'idle' | 'running' | 'error';

export type ArmResponse = {
  state: ArmState;
  state_label: string;
  detail: string | null;
  last_command: unknown;
  telemetry: Record<string, unknown> | null;
  reported_at: string | null;
};

export type ArmZone = {
  slug: string;
  label: string;
  joint_angles: number[];
  selectable: boolean;
};

export type ArmZonesResponse = {
  zones: ArmZone[];
};

export type ArmCommandRequest = {
  category: string;
  context?: Record<string, unknown>;
};

export type ArmCommandResponse = {
  message: string;
  command: {
    category: string;
    zone: string;
    joint_angles: number[];
    issued_at: string;
  };
};

export class ArmCommandUnavailableError extends Error {
  constructor(message = 'Fitur kirim command belum tersedia di server.') {
    super(message);
    this.name = 'ArmCommandUnavailableError';
  }
}

export class ArmZoneUnmappedError extends Error {
  constructor(message = 'Kategori ini tidak memiliki zona target yang dikonfigurasi.') {
    super(message);
    this.name = 'ArmZoneUnmappedError';
  }
}

export class ArmBrokerOfflineError extends Error {
  constructor(message = 'Broker MQTT sedang offline. Coba lagi nanti.') {
    super(message);
    this.name = 'ArmBrokerOfflineError';
  }
}

export async function getArmState(): Promise<ArmResponse> {
  return apiRequest<ArmResponse>('/arm');
}

export async function getArmZones(): Promise<ArmZone[]> {
  const response = await apiRequest<ArmZonesResponse>('/arm/zones');
  return response.zones.filter((z) => z.selectable);
}

export async function sendArmCommand(
  category: string,
  context?: Record<string, unknown>,
): Promise<ArmCommandResponse> {
  try {
    return await apiRequest<ArmCommandResponse>('/arm/command', {
      method: 'POST',
      body: { category, context } satisfies ArmCommandRequest,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404 || error.status === 501) {
        throw new ArmCommandUnavailableError();
      }
      if (error.status === 422) {
        throw new ArmZoneUnmappedError();
      }
      if (error.status === 503) {
        throw new ArmBrokerOfflineError();
      }
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
