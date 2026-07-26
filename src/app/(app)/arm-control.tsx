import StatusBadge from '@/components/StatusBadge';
import { useArm } from '@/contexts/ArmContext';
import {
  ArmBrokerOfflineError,
  ArmCommandUnavailableError,
  ArmZoneUnmappedError,
  type ArmCommandResponse,
  type ArmZone,
} from '@/services/armApi';
import { type DetectionItem } from '@/services/statusApi';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const PRODUCT_CATEGORIES = [
  'Yogurt',
  'Susu UHT',
  'Keju',
  'Susu Kedelai',
];

function formatRelative(iso: string | null): string {
  if (!iso) return '-';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return iso;
  const diff = Date.now() - t;
  if (diff < 0) return new Date(iso).toLocaleTimeString();
  const s = Math.floor(diff / 1000);
  if (s < 60) return \\ detik lalu\;
  const m = Math.floor(s / 60);
  if (m < 60) return \\ menit lalu\;
  const h = Math.floor(m / 60);
  if (h < 24) return \\ jam lalu\;
  return new Date(iso).toLocaleString();
}

function ConnRow({
  label,
  active,
  onText,
  offText,
}: {
  label: string;
  active: boolean;
  onText: string;
  offText: string;
}) {
  return (
    <View style={styles.connRow}>
      <Text style={styles.connLabel}>{label}</Text>
      <View style={styles.connValue}>
        <View
          style={[styles.dot, { backgroundColor: active ? '#16a34a' : '#9ca3af' }]}
        />
        <Text style={[styles.connText, { color: active ? '#16a34a' : '#6b7280' }]}>
          {active ? onText : offText}
        </Text>
      </View>
    </View>
  );
}

function DetectionRow({ item, last }: { item: DetectionItem; last: boolean }) {
  const title = item.code ?? item.qr_value ?? \Product #\\;
  const meta = [item.camera, item.conveyor].filter(Boolean).join(' • ');
  return (
    <View style={[styles.tableRow, !last && styles.tableRowBorder]}>
      <View style={styles.tableLeft}>
        <Text style={styles.tableId}>{title}</Text>
        {meta ? <Text style={styles.tableProduct}>{meta}</Text> : null}
      </View>
      <View style={styles.tableRight}>
        {item.status ? <StatusBadge status={item.status} /> : null}
        <Text style={styles.tableTime}>{formatRelative(item.detected_at)}</Text>
      </View>
    </View>
  );
}

function CommandFeedback({
  result,
  error,
  onRetry,
}: {
  result: ArmCommandResponse | null;
  error: string | null;
  onRetry: () => void;
}) {
  if (!result && !error) return null;

  if (result) {
    return (
      <View style={styles.feedbackBox}>
        <View style={styles.feedbackRow}>
          <Ionicons name='checkmark-circle' size={20} color='#16a34a' />
          <Text style={styles.feedbackText}>{result.message}</Text>
        </View>
        {result.command && (
          <View style={styles.commandEcho}>
            <Text style={styles.echoLabel}>Zona: {result.command.zone}</Text>
            <Text style={styles.echoLabel}>
              Sudut sendi: [{result.command.joint_angles.join(', ')}]
            </Text>
          </View>
        )}
      </View>
    );
  }

  const isRetryable =
    error === ArmBrokerOfflineError.name ||
    error?.includes('offline') ||
    error?.includes('timeout');

  return (
    <View style={[styles.feedbackBox, styles.feedbackBoxError]}>
      <View style={styles.feedbackRow}>
        <Ionicons name='alert-circle' size={20} color='#dc2626' />
        <Text style={[styles.feedbackText, styles.feedbackTextError]}>{error}</Text>
      </View>
      {isRetryable ? (
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Ionicons name='refresh-outline' size={16} color='#fff' />
          <Text style={styles.retryBtnText}>Coba lagi</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ArmControlScreen() {
  const {
    status,
    armState,
    detections,
    isMqttConnected,
    isMqttConfigured,
    isLoading,
    zones,
    zoneLoading,
    zoneError,
    refresh,
    sendCommand,
  } = useArm();

  const selectedCategory = zones.length > 0 ? zones[0].slug : PRODUCT_CATEGORIES[0];
  const [localCategory, setLocalCategory] = useState(selectedCategory);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commandResult, setCommandResult] = useState<ArmCommandResponse | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);

  useEffect(() => {
    setLocalCategory(zones.length > 0 ? zones[0].slug : PRODUCT_CATEGORIES[0]);
  }, [zones]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const onSend = useCallback(async () => {
    setIsSending(true);
    setCommandResult(null);
    setCommandError(null);
    try {
      const result = await sendCommand(localCategory);
      setCommandResult(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Gagal mengirim command.';
      setCommandError(message);
    } finally {
      setIsSending(false);
    }
  }, [localCategory, sendCommand]);

  const telemetryEntries = armState?.telemetry
    ? Object.entries(armState.telemetry).slice(0, 8)
    : [];

  const zonesAvailable = zones.length > 0;
  const selectedZone = zones.find((z) => z.slug === localCategory);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {/* Arm state */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionTitle}>Status Arm</Text>
          {isLoading && !armState ? (
            <ActivityIndicator size='small' color='#2563eb' />
          ) : (
            <StatusBadge status={armState?.state ?? 'idle'} />
          )}
        </View>
        <Text style={styles.stateLabel}>
          {armState?.state_label ?? 'Belum ada data'}
        </Text>
        {armState?.detail ? (
          <Text style={styles.detail}>{armState.detail}</Text>
        ) : null}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaKey}>Terakhir dilaporkan</Text>
            <Text style={styles.metaVal}>
              {formatRelative(armState?.reported_at ?? null)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaKey}>Command terakhir</Text>
            <Text style={styles.metaVal} numberOfLines={2}>
              {armState?.last_command != null
                ? JSON.stringify(armState.last_command)
                : '-'}
            </Text>
          </View>
        </View>

        {telemetryEntries.length > 0 && (
          <View style={styles.telemetryBox}>
            {telemetryEntries.map(([k, v]) => (
              <View key={k} style={styles.telemetryRow}>
                <Text style={styles.telemetryKey}>{k}</Text>
                <Text style={styles.telemetryVal} numberOfLines={1}>
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Connection indicators */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Koneksi</Text>
        <ConnRow
          label='Server (REST)'
          active={status?.status === 'online'}
          onText='Online'
          offText={status ? 'Offline' : 'Belum terhubung'}
        />
        <ConnRow
          label='Broker MQTT (menurut backend)'
          active={!!status?.mqtt_connected}
          onText='Terhubung'
          offText='Terputus'
        />
        <ConnRow
          label='MQTT langsung (mobile)'
          active={isMqttConnected}
          onText='Terhubung'
          offText={isMqttConfigured ? 'Terputus' : 'Tidak dikonfigurasi'}
        />
        {!isMqttConfigured && (
          <Text style={styles.hint}>
            Set EXPO_PUBLIC_MQTT_WS_URL untuk telemetry realtime. Tanpa itu,
            data diambil lewat polling REST.
          </Text>
        )}
      </View>

      {/* Command */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Kirim ke Zona</Text>
        <Text style={styles.hint}>
          Pilih zona target, backend akan meresolusi sudut sendi (TargetZonePreset)
          dan publish command ke arm.
        </Text>

        {/* Zone selection */}
        <Text style={styles.fieldLabel}>Zona Target</Text>
        {zoneLoading ? (
          <ActivityIndicator size='small' color='#2563eb' />
        ) : zoneError ? (
          <Text style={styles.errorText}>
            Gagal memuat zona: {zoneError}. Gunakan daftar kategori default.
          </Text>
        ) : zonesAvailable ? (
          <View style={styles.chipsRow}>
            {zones.map((zone) => {
              const active = zone.slug === localCategory;
              return (
                <Pressable
                  key={zone.slug}
                  onPress={() => {
                    setLocalCategory(zone.slug);
                    setCommandResult(null);
                    setCommandError(null);
                  }}
                  style={[
                    styles.chip,
                    active && styles.chipActive,
                    !zone.selectable && styles.chipDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                      !zone.selectable && styles.chipTextDisabled,
                    ]}
                  >
                    {zone.label}
                  </Text>
                  {!zone.selectable && (
                    <Text style={styles.chipBadge}>internal</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.chipsRow}>
            {PRODUCT_CATEGORIES.map((cat) => {
              const active = cat === localCategory;
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    setLocalCategory(cat);
                    setCommandResult(null);
                    setCommandError(null);
                  }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {selectedZone && selectedZone.joint_angles.length > 0 ? (
          <Text style={styles.hint}>
            Sudut sendi zona ini: [{selectedZone.joint_angles.join(', ')}]
          </Text>
        ) : null}

        <Pressable
          onPress={onSend}
          disabled={isSending}
          style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
        >
          {isSending ? (
            <ActivityIndicator size='small' color='#fff' />
          ) : (
            <>
              <Ionicons name='send-outline' size={18} color='#fff' />
              <Text style={styles.sendBtnText}>Kirim ke Zona Ini</Text>
            </>
          )}
        </Pressable>

        {/* Inline feedback — menggantikan Alert.alert */}
        <CommandFeedback
          result={commandResult}
          error={commandError}
          onRetry={onSend}
        />
      </View>

      {/* Detections */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionTitle}>Deteksi Terbaru</Text>
          <Text style={styles.sourceTag}>
            {isMqttConnected ? 'realtime' : 'REST'}
          </Text>
        </View>
        {detections.length === 0 ? (
          <Text style={styles.empty}>Belum ada deteksi.</Text>
        ) : (
          detections
            .slice(0, 15)
            .map((det, idx, arr) => (
              <DetectionRow
                key={\\-\\}
                item={det}
                last={idx === arr.length - 1}
              />
            ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
  },
  stateLabel: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
  },
  detail: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#6b7280',
    marginTop: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  metaItem: { flex: 1 },
  metaKey: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: '#9ca3af',
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
  },
  telemetryBox: {
    marginTop: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  telemetryKey: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#6b7280',
  },
  telemetryVal: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
    flexShrink: 1,
    textAlign: 'right',
  },
  connRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  connLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#374151',
    flex: 1,
  },
  connValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  connText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  hint: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  chipDisabled: { opacity: 0.4 },
  chipText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#6b7280',
  },
  chipTextActive: { color: '#2563eb', fontFamily: 'Poppins_600SemiBold' },
  chipTextDisabled: { color: '#9ca3af' },
  chipBadge: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: '#9ca3af',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
  },
  sourceTag: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  empty: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#9ca3af',
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tableLeft: { flex: 1, paddingRight: 8 },
  tableId: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#111827' },
  tableProduct: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#6b7280',
    marginTop: 2,
  },
  tableRight: { alignItems: 'flex-end', gap: 4 },
  tableTime: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#9ca3af',
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#dc2626',
    marginBottom: 12,
  },
  feedbackBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    gap: 6,
  },
  feedbackBoxError: {
    backgroundColor: '#fef2f2',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#16a34a',
    flex: 1,
  },
  feedbackTextError: {
    color: '#dc2626',
  },
  commandEcho: {
    marginTop: 4,
    paddingLeft: 28,
    gap: 2,
  },
  echoLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#6b7280',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
  },
});
