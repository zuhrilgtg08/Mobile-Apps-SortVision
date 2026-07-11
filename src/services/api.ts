import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const AUTH_TOKEN_KEY = "sortvision.auth.token";

const DEFAULT_API_BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:8000/api"
    : "http://127.0.0.1:8000/api";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
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
  }

  return "Request failed";
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", "application/json");

  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  if (token && options.auth !== false) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedHandler?.();
    }

    throw new Error(extractErrorMessage(payload));
  }

  return payload as T;
}
