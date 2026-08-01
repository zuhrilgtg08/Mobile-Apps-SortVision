import * as storage from "@/services/storage";
import { Platform } from "react-native";

export const AUTH_TOKEN_KEY = "sortvision.auth.token";

const DEFAULT_API_BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:8000/api"
    : "http://127.0.0.1:8000/api";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;

/** Error yang membawa HTTP status code supaya service layer bisa membedakan 404/501 dsb. */
export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  /**
   * Jangan panggil global unauthorized handler (redirect ke /login) saat 401.
   * Dipakai untuk request login: 401 di sini artinya "kredensial salah",
   * bukan sesi kadaluarsa — biar UI bisa menampilkan error tanpa remount.
   */
  suppressUnauthorized?: boolean;
};

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function parseResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const text = response.text ? response.text() : Promise.resolve("");

  return text.then((raw) => {
    if (!raw) {
      return null;
    }

    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }

    return raw;
  });
}

function extractErrorMessage(payload: unknown) {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as Record<string, unknown>;
    const message = candidate.message;
    if (typeof message === "string") {
      return message;
    }

    const error = candidate.error;
    if (typeof error === "string") {
      return error;
    }

    const errors = candidate.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return String(errors[0]);
    }

    // Laravel 422: `errors` berbentuk objek `{ field: [pesan, ...] }`.
    if (errors && typeof errors === "object") {
      const first = Object.values(errors as Record<string, unknown>)[0];
      if (Array.isArray(first) && first.length > 0) {
        return String(first[0]);
      }
      if (typeof first === "string") {
        return first;
      }
    }
  }

  return "Request failed";
}

/**
 * `403` dari API artinya role pemakai tidak punya hak atas modul ini (middleware
 * `EnsureModuleAccess` di backend), atau akunnya dinonaktifkan — bukan sesi
 * kadaluarsa. Layar harus menampilkan "tidak punya akses", bukan melempar user
 * ke halaman login seperti pada `401`.
 */
export function isForbiddenError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 403;
}

/** `404` — resource sudah dihapus orang lain, atau id-nya salah. */
export function isNotFoundError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 404;
}

/**
 * Ambil error per-field dari response validasi Laravel (`422`) supaya form bisa
 * menandai input yang bermasalah, bukan cuma menampilkan satu pesan global.
 * Mengembalikan objek kosong kalau error-nya bukan error validasi.
 */
export function extractFieldErrors(
  error: unknown,
): Record<string, string> {
  if (!(error instanceof ApiError) || !error.payload) {
    return {};
  }

  const payload = error.payload as Record<string, unknown>;
  const errors = payload.errors;
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(
    errors as Record<string, unknown>,
  )) {
    if (Array.isArray(messages) && messages.length > 0) {
      result[field] = String(messages[0]);
    } else if (typeof messages === "string") {
      result[field] = messages;
    }
  }

  return result;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", "application/json");

  const token = await storage.getItemAsync(AUTH_TOKEN_KEY);
  if (token && options.auth !== false) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // FormData (upload gambar/avatar) harus dikirim apa adanya: fetch yang
  // menyusun sendiri header multipart beserta boundary-nya. Menyetel
  // Content-Type manual justru merusak boundary tersebut.
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.body !== undefined && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? "GET",
    headers,
    body:
      options.body === undefined
        ? undefined
        : isFormData
          ? (options.body as FormData)
          : JSON.stringify(options.body),
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    if (response.status === 401 && options.suppressUnauthorized !== true) {
      unauthorizedHandler?.();
    }

    throw new ApiError(
      extractErrorMessage(payload),
      response.status,
      payload,
    );
  }

  return payload as T;
}
