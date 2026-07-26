import { useAuth } from '@/contexts/AuthContext';
import {
  ArmBrokerOfflineError,
  ArmCommandUnavailableError,
  ArmZoneUnmappedError,
  getArmState,
  getArmZones,
  sendArmCommand,
  type ArmCommandResponse,
  type ArmResponse,
  type ArmState,
  type ArmZone,
} from '@/services/armApi';
import { createMqttClient, type MqttClient } from '@/services/mqttClient';
import {
  getDetections,
  getStatus,
  type DetectionItem,
  type StatusResponse,
} from '@/services/statusApi';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const POLL_INTERVAL_MS = 7000;
const MAX_DETECTIONS = 50;
const MQTT_PRIMACY_MS = 15_000;

const MQTT_WS_URL = process.env.EXPO_PUBLIC_MQTT_WS_URL ?? '';
const MQTT_BASE_TOPIC = process.env.EXPO_PUBLIC_MQTT_BASE_TOPIC ?? 'arm';
const MQTT_USERNAME = process.env.EXPO_PUBLIC_MQTT_USERNAME || undefined;
const MQTT_PASSWORD = process.env.EXPO_PUBLIC_MQTT_PASSWORD || undefined;

type ArmContextType = {
  status: StatusResponse | null;
  armState: ArmResponse | null;
  detections: DetectionItem[];
  isMqttConnected: boolean;
  isMqttConfigured: boolean;
  lastError: string | null;
  isLoading: boolean;
  /** Daftar zona selectable dari backend (Fase 3). */
  zones: ArmZone[];
  zoneLoading: boolean;
  zoneError: string | null;
  refresh: () => Promise<void>;
  refreshZones: () => Promise<void>;
  sendCommand: (
    category: string,
    context?: Record<string, unknown>,
  ) => Promise<ArmCommandResponse | null>;
  clearError: () => void;
};

const ArmContext = createContext<ArmContextType | null>(null);

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function normalizeArmState(value: unknown): ArmState {
  const s = asString(value)?.toLowerCase();
  if (s === 'running' || s === 'error' || s === 'idle') return s;
  return 'idle';
}

function armFromMqtt(payload: unknown, prev: ArmResponse | null): ArmResponse {
  const obj = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const state = 'state' in obj ? normalizeArmState(obj.state) : prev?.state ?? 'idle';
  return {
    state,
    state_label: asString(obj.state_label) ?? prev?.state_label ?? state,
    detail: asString(obj.detail) ?? prev?.detail ?? null,
    last_command: 'last_command' in obj ? obj.last_command : prev?.last_command ?? null,
    telemetry:
      obj.telemetry && typeof obj.telemetry === 'object'
        ? (obj.telemetry as Record<string, unknown>)
        : (obj as Record<string, unknown>),
    reported_at: asString(obj.reported_at) ?? new Date().toISOString(),
  };
}

function detectionFromMqtt(payload: unknown): DetectionItem | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  return {
    code: asString(obj.code),
    product_id: asNumber(obj.product_id),
    camera: asString(obj.camera),
    conveyor: asString(obj.conveyor),
    status: asString(obj.status),
    qr_value: asString(obj.qr_value),
    confidence: asNumber(obj.confidence),
    detected_at: asString(obj.detected_at) ?? new Date().toISOString(),
  };
}

export function ArmProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [armState, setArmState] = useState<ArmResponse | null>(null);
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [isMqttConnected, setIsMqttConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [zones, setZones] = useState<ArmZone[]>([]);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const isFetchingRef = useRef(false);
  const lastMqttArmAtRef = useRef(0);
  const lastMqttDetectionAtRef = useRef(0);

  const isMqttConfigured = MQTT_WS_URL.length > 0;
  const isLoading = isAuthenticated && status === null && armState === null && lastError === null;

  const refresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [statusRes, armRes, detectionsRes] = await Promise.allSettled([
        getStatus(),
        getArmState(),
        getDetections(),
      ]);

      if (statusRes.status === 'fulfilled') setStatus(statusRes.value);
      const now = Date.now();
      if (armRes.status === 'fulfilled' && now - lastMqttArmAtRef.current > MQTT_PRIMACY_MS) {
        setArmState(armRes.value);
      }
      if (detectionsRes.status === 'fulfilled' && now - lastMqttDetectionAtRef.current > MQTT_PRIMACY_MS) {
        setDetections(detectionsRes.value.slice(0, MAX_DETECTIONS));
      }

      const firstFailure = [statusRes, armRes, detectionsRes].find(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      if (firstFailure) {
        const reason = firstFailure.reason;
        setLastError(reason instanceof Error ? reason.message : String(reason));
      } else {
        setLastError(null);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const refreshZones = useCallback(async () => {
    setZoneLoading(true);
    setZoneError(null);
    try {
      const fetched = await getArmZones();
      setZones(fetched);
    } catch (err) {
      setZoneError(err instanceof Error ? err.message : 'Gagal memuat zona');
    } finally {
      setZoneLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refresh();
    const interval = setInterval(() => { void refresh(); }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      setStatus(null);
      setArmState(null);
      setDetections([]);
      setLastError(null);
    };
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshZones();
  }, [isAuthenticated, refreshZones]);

  useEffect(() => {
    if (!isAuthenticated || !isMqttConfigured) return;
    let client: MqttClient | null = null;
    try {
      client = createMqttClient({
        url: MQTT_WS_URL,
        topics: [`${MQTT_BASE_TOPIC}/status`, `${MQTT_BASE_TOPIC}/detection`],
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD,
        onConnectionChange: setIsMqttConnected,
        onMessage: (topic, payloadRaw) => {
          let payload: unknown = payloadRaw;
          try { payload = JSON.parse(payloadRaw); } catch { /* raw text */ }
          if (topic === `${MQTT_BASE_TOPIC}/status`) {
            lastMqttArmAtRef.current = Date.now();
            setArmState((prev) => armFromMqtt(payload, prev));
          } else if (topic === `${MQTT_BASE_TOPIC}/detection`) {
            const item = detectionFromMqtt(payload);
            if (item) {
              lastMqttDetectionAtRef.current = Date.now();
              setDetections((prev) => [item, ...prev].slice(0, MAX_DETECTIONS));
            }
          }
        },
      });
      client.connect();
    } catch { /* REST polling stays as fallback */ }
    return () => { client?.disconnect(); setIsMqttConnected(false); };
  }, [isAuthenticated, isMqttConfigured]);

  const sendCommand = useCallback(
    async (category: string, context?: Record<string, unknown>): Promise<ArmCommandResponse | null> => {
      try {
        const result = await sendArmCommand(category, context);
        setLastError(null);
        // Optimistic echo: refresh arm state so UI shows latest immediately.
        void refresh();
        return result;
      } catch (error) {
        const message =
          error instanceof ArmCommandUnavailableError
            ? error.message
            : error instanceof ArmZoneUnmappedError
              ? error.message
              : error instanceof ArmBrokerOfflineError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : 'Gagal mengirim command.';
        setLastError(message);
        throw error instanceof Error ? error : new Error(message);
      }
    },
    [sendArmCommand, refresh],
  );

  const clearError = useCallback(() => setLastError(null), []);

  return (
    <ArmContext.Provider
      value={{
        status,
        armState,
        detections,
        isMqttConnected,
        isMqttConfigured,
        lastError,
        isLoading,
        zones,
        zoneLoading,
        zoneError,
        refresh,
        refreshZones,
        sendCommand,
        clearError,
      }}
    >
      {children}
    </ArmContext.Provider>
  );
}

export function useArm() {
  const ctx = useContext(ArmContext);
  if (!ctx) throw new Error('useArm must be used within ArmProvider');
  return ctx;
}
