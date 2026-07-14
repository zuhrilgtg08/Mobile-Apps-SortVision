/**
 * Minimal MQTT 3.1.1 client over WebSocket — SUBSCRIBE-ONLY.
 *
 * Kenapa implementasi sendiri, bukan `mqtt` (mqtt.js) atau `paho-mqtt`?
 * - Managed Expo (SDK 57), Hermes, tanpa native module / dev-client.
 * - `mqtt.js` butuh polyfill Node core (`stream`, `Buffer`) yang rapuh di Metro/Hermes.
 * - `paho-mqtt` mengasumsikan global browser (`window`, `localStorage`).
 * - Kebutuhan kita hanya SUBSCRIBE read-only ke `arm/status` & `arm/detection`,
 *   jadi surface protokol kecil (CONNECT, SUBSCRIBE, PUBLISH-in, PING, DISCONNECT).
 * Implementasi ini hanya memakai global `WebSocket` + `ArrayBuffer`/`Uint8Array`
 * yang tersedia di iOS/Android/web, sehingga selalu bundel bersih & tidak pernah
 * bikin `npx expo start` gagal.
 *
 * CATATAN: mobile TIDAK PERNAH publish. Command arm dikirim lewat REST ke backend.
 */

export type MqttMessageHandler = (topic: string, payload: string) => void;

export type MqttClientOptions = {
  /** URL broker WebSocket, mis. `ws://host:8083/mqtt` (EMQX) atau `ws://host:9001` (Mosquitto). */
  url: string;
  /** Topik yang akan di-subscribe (QoS 0). */
  topics: string[];
  username?: string;
  password?: string;
  keepaliveSeconds?: number;
  onMessage: MqttMessageHandler;
  /** Dipanggil hanya saat status koneksi berubah (true/false). */
  onConnectionChange: (connected: boolean) => void;
};

export type MqttClient = {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
};

// --- Encoding helpers -------------------------------------------------------

const textEncoder =
  typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
const textDecoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;

function encodeUtf8(str: string): Uint8Array {
  if (textEncoder) return textEncoder.encode(str);
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const lo = str.charCodeAt(++i);
      code = 0x10000 + ((code - 0xd800) << 10) + (lo - 0xdc00);
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

function decodeUtf8(bytes: Uint8Array): string {
  if (textDecoder) return textDecoder.decode(bytes);
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else if (b < 0xe0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
    } else if (b < 0xf0) {
      out += String.fromCharCode(
        ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f),
      );
    } else {
      const cp =
        ((b & 0x07) << 18) |
        ((bytes[i++] & 0x3f) << 12) |
        ((bytes[i++] & 0x3f) << 6) |
        (bytes[i++] & 0x3f);
      const c = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 0x3ff));
    }
  }
  return out;
}

function encodeString(str: string): number[] {
  const b = encodeUtf8(str);
  return [(b.length >> 8) & 0xff, b.length & 0xff, ...b];
}

function encodeRemainingLength(len: number): number[] {
  const out: number[] = [];
  do {
    let byte = len % 128;
    len = Math.floor(len / 128);
    if (len > 0) byte |= 0x80;
    out.push(byte);
  } while (len > 0);
  return out;
}

function buildPacket(byte1: number, body: number[]): Uint8Array {
  return new Uint8Array([byte1, ...encodeRemainingLength(body.length), ...body]);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

// --- Client -----------------------------------------------------------------

const CONNACK_TIMEOUT_MS = 10_000;
const BACKOFF_MS = [2000, 4000, 8000, 16000, 30000];
const MAX_ATTEMPTS = BACKOFF_MS.length + 3; // beberapa retry di cap 30s lalu diam

class MqttWsClient implements MqttClient {
  private opts: MqttClientOptions;
  private ws: WebSocket | null = null;
  private rxBuffer: Uint8Array = new Uint8Array(0);
  private connected = false;
  private closedByUser = false;
  private attempt = 0;
  private packetId = 1;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connackTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private readonly keepalive: number;

  constructor(opts: MqttClientOptions) {
    this.opts = opts;
    this.keepalive = Math.max(10, opts.keepaliveSeconds ?? 60);
  }

  isConnected() {
    return this.connected;
  }

  connect = () => {
    this.closedByUser = false;
    this.openSocket();
  };

  disconnect = () => {
    this.closedByUser = true;
    this.clearTimers();
    if (this.ws) {
      try {
        if (this.ws.readyState === 1 /* OPEN */) {
          this.ws.send(new Uint8Array([0xe0, 0x00])); // DISCONNECT
        }
        this.ws.close();
      } catch {
        // abaikan error saat menutup
      }
    }
    this.ws = null;
    this.rxBuffer = new Uint8Array(0);
    this.setConnected(false);
  };

  private openSocket() {
    if (typeof WebSocket === "undefined") {
      // Lingkungan tanpa WebSocket — anggap MQTT tidak tersedia.
      return;
    }
    if (this.ws) return;

    let ws: WebSocket;
    try {
      // Subprotocol "mqtt" sesuai spesifikasi MQTT-over-WebSocket.
      ws = new WebSocket(this.opts.url, "mqtt");
    } catch {
      this.scheduleReconnect();
      return;
    }
    ws.binaryType = "arraybuffer";
    this.ws = ws;

    ws.onopen = () => {
      this.rxBuffer = new Uint8Array(0);
      this.send(this.buildConnect());
      this.connackTimer = setTimeout(() => {
        // Tidak ada CONNACK tepat waktu → tutup & retry.
        this.forceReconnect();
      }, CONNACK_TIMEOUT_MS);
    };

    ws.onmessage = (event: { data: unknown }) => {
      const data = event.data;
      let chunk: Uint8Array | null = null;
      if (data instanceof ArrayBuffer) {
        chunk = new Uint8Array(data);
      } else if (ArrayBuffer.isView(data)) {
        const view = data as ArrayBufferView;
        chunk = new Uint8Array(
          view.buffer as ArrayBuffer,
          view.byteOffset,
          view.byteLength,
        );
      }
      if (!chunk) return;
      this.rxBuffer = concat(this.rxBuffer, chunk);
      this.parseBuffer();
    };

    ws.onerror = () => {
      // onclose akan menyusul dan menangani reconnect.
    };

    ws.onclose = () => {
      this.clearTimers();
      this.ws = null;
      this.setConnected(false);
      if (!this.closedByUser) {
        this.scheduleReconnect();
      }
    };
  }

  private forceReconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // abaikan
      }
      this.ws = null;
    }
    this.clearTimers();
    this.setConnected(false);
    if (!this.closedByUser) this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.closedByUser || this.reconnectTimer) return;
    if (this.attempt >= MAX_ATTEMPTS) {
      // Sudah cukup mencoba — diam, andalkan REST polling di ArmContext.
      return;
    }
    const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)];
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connackTimer) {
      clearTimeout(this.connackTimer);
      this.connackTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private setConnected(value: boolean) {
    if (this.connected === value) return;
    this.connected = value;
    try {
      this.opts.onConnectionChange(value);
    } catch {
      // jangan biarkan handler user menjatuhkan client
    }
  }

  private send(packet: Uint8Array) {
    if (this.ws && this.ws.readyState === 1) {
      try {
        this.ws.send(packet);
      } catch {
        this.forceReconnect();
      }
    }
  }

  private nextPacketId(): number {
    this.packetId = (this.packetId % 0xffff) + 1;
    return this.packetId;
  }

  // --- Packet builders ---

  private buildConnect(): Uint8Array {
    const body: number[] = [];
    body.push(...encodeString("MQTT"));
    body.push(0x04); // protocol level 3.1.1
    let flags = 0x02; // clean session
    const { username, password } = this.opts;
    if (username) flags |= 0x80;
    if (username && password) flags |= 0x40;
    body.push(flags);
    body.push((this.keepalive >> 8) & 0xff, this.keepalive & 0xff);
    const clientId = `sortvision-mobile-${Math.random().toString(16).slice(2, 10)}`;
    body.push(...encodeString(clientId));
    if (username) body.push(...encodeString(username));
    if (username && password) body.push(...encodeString(password));
    return buildPacket(0x10, body);
  }

  private buildSubscribe(): Uint8Array {
    const body: number[] = [];
    const id = this.nextPacketId();
    body.push((id >> 8) & 0xff, id & 0xff);
    for (const topic of this.opts.topics) {
      body.push(...encodeString(topic));
      body.push(0x00); // QoS 0
    }
    return buildPacket(0x82, body); // type 8 + flags 0b0010
  }

  // --- Incoming parsing ---

  private parseBuffer() {
    const buf = this.rxBuffer;
    let offset = 0;

    while (offset < buf.length) {
      if (buf.length - offset < 2) break; // butuh minimal fixed header

      // Decode Remaining Length (varint, max 4 byte).
      let multiplier = 1;
      let remLen = 0;
      let i = offset + 1;
      let lenBytes = 0;
      let incomplete = false;
      let byte: number;
      do {
        if (i >= buf.length) {
          incomplete = true;
          break;
        }
        byte = buf[i];
        remLen += (byte & 0x7f) * multiplier;
        multiplier *= 128;
        i++;
        lenBytes++;
        if (lenBytes > 4) {
          // Malformed — buang seluruh buffer & reconnect.
          this.rxBuffer = new Uint8Array(0);
          this.forceReconnect();
          return;
        }
      } while ((byte! & 0x80) !== 0);

      if (incomplete) break;

      const headerLen = 1 + lenBytes;
      const totalLen = headerLen + remLen;
      if (buf.length - offset < totalLen) break; // paket belum lengkap

      const packetType = buf[offset] >> 4;
      const flags = buf[offset] & 0x0f;
      const payload = buf.subarray(offset + headerLen, offset + totalLen);
      this.handlePacket(packetType, flags, payload);
      offset += totalLen;
    }

    this.rxBuffer = offset > 0 ? buf.slice(offset) : buf;
  }

  private handlePacket(type: number, _flags: number, payload: Uint8Array) {
    switch (type) {
      case 2: // CONNACK
        if (payload.length >= 2 && payload[1] === 0x00) {
          if (this.connackTimer) {
            clearTimeout(this.connackTimer);
            this.connackTimer = null;
          }
          this.attempt = 0;
          this.send(this.buildSubscribe());
          this.startPing();
          this.setConnected(true);
        } else {
          // CONNACK ditolak (kredensial/protokol) — jangan spam retry tanpa henti.
          this.attempt = MAX_ATTEMPTS;
          this.forceReconnect();
        }
        break;
      case 3: // PUBLISH (telemetry masuk)
        this.handlePublish(_flags, payload);
        break;
      case 13: // PINGRESP
      case 9: // SUBACK
      default:
        break;
    }
  }

  private handlePublish(flags: number, payload: Uint8Array) {
    if (payload.length < 2) return;
    const qos = (flags >> 1) & 0x03;
    const topicLen = (payload[0] << 8) | payload[1];
    let pos = 2 + topicLen;
    if (pos > payload.length) return;
    const topic = decodeUtf8(payload.subarray(2, pos));

    if (qos > 0) {
      if (pos + 2 > payload.length) return;
      const packetId = (payload[pos] << 8) | payload[pos + 1];
      pos += 2;
      if (qos === 1) {
        // PUBACK — walau kita subscribe QoS 0, broker bisa saja mengirim QoS 1.
        this.send(buildPacket(0x40, [(packetId >> 8) & 0xff, packetId & 0xff]));
      }
    }

    const message = decodeUtf8(payload.subarray(pos));
    try {
      this.opts.onMessage(topic, message);
    } catch {
      // handler user tidak boleh menjatuhkan parser
    }
  }

  private startPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    const intervalMs = Math.floor(this.keepalive * 0.75) * 1000;
    this.pingTimer = setInterval(() => {
      this.send(new Uint8Array([0xc0, 0x00])); // PINGREQ
    }, intervalMs);
  }
}

export function createMqttClient(options: MqttClientOptions): MqttClient {
  return new MqttWsClient(options);
}
