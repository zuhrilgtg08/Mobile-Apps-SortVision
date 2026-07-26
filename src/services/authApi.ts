import { ApiError, apiRequest, AUTH_TOKEN_KEY } from "@/services/api";
import * as storage from "@/services/storage";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
};

export type AuthSession = {
  token: string;
  user: User;
  role: string;
};

const AUTH_USER_KEY = "sortvision.auth.user";
const AUTH_ROLE_KEY = "sortvision.auth.role";

function normalizeUser(user: Partial<User> | null | undefined): User {
  return {
    id: user?.id ?? 0,
    name: user?.name ?? user?.email ?? "User",
    email: user?.email ?? "",
    role: user?.role ?? "User",
    avatar_url: user?.avatar_url,
  };
}

export async function persistAuthSession(
  token: string,
  user: User,
  role: string,
) {
  await storage.setItemAsync(AUTH_TOKEN_KEY, token);
  await storage.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
  await storage.setItemAsync(AUTH_ROLE_KEY, role);
}

export async function getStoredAuthSession(): Promise<AuthSession | null> {
  const token = await storage.getItemAsync(AUTH_TOKEN_KEY);
  if (!token) {
    return null;
  }

  const userRaw = await storage.getItemAsync(AUTH_USER_KEY);
  const role = (await storage.getItemAsync(AUTH_ROLE_KEY)) ?? "User";
  const user = userRaw ? JSON.parse(userRaw) : null;

  return {
    token,
    user: normalizeUser(user),
    role,
  };
}

export async function clearStoredAuthSession() {
  await storage.deleteItemAsync(AUTH_TOKEN_KEY);
  await storage.deleteItemAsync(AUTH_USER_KEY);
  await storage.deleteItemAsync(AUTH_ROLE_KEY);
}

/**
 * Bentuk response auth yang ditoleransi mobile. Nama field token & posisi user
 * sengaja dibuat longgar karena backend bisa membungkusnya di `data`.
 */
type AuthResponsePayload = {
  token?: string;
  access_token?: string;
  accessToken?: string;
  message?: string;
  user?: Partial<User>;
  role?: string;
  data?: { user?: Partial<User>; role?: string };
};

/**
 * Error khusus untuk endpoint auth yang BELUM diimplementasikan backend
 * (`/auth/register`, `/auth/forgot-password`, `/auth/reset-password` — lihat
 * `API_CONTRACT.md`). Dipisahkan supaya UI bisa menampilkan pesan "belum
 * tersedia di server" alih-alih pesan error mentah atau, lebih buruk lagi,
 * pura-pura berhasil.
 */
export class AuthEndpointUnavailableError extends Error {
  constructor(message = "Fitur ini belum tersedia di server.") {
    super(message);
    this.name = "AuthEndpointUnavailableError";
  }
}

/** Terjemahkan 404/501 (endpoint belum ada) jadi error yang ramah UI. */
function translateMissingEndpoint(error: unknown, message: string): never {
  if (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 501)
  ) {
    throw new AuthEndpointUnavailableError(message);
  }

  throw error instanceof Error ? error : new Error(String(error));
}

/** Ambil token + user dari response auth, lalu simpan sebagai sesi aktif. */
async function sessionFromResponse(
  response: AuthResponsePayload,
): Promise<AuthSession | null> {
  const token = response.token ?? response.access_token ?? response.accessToken;
  if (!token) {
    return null;
  }

  const userPayload = response.user ?? response.data?.user ?? null;
  const role =
    response.role ?? response.data?.role ?? userPayload?.role ?? "User";
  const user = normalizeUser(userPayload);
  await persistAuthSession(token, user, role);

  return { token, user, role };
}

export async function loginWithEmail(email: string, password: string) {
  const response = await apiRequest<AuthResponsePayload>("/auth/login", {
    method: "POST",
    body: { email, password },
    // 401 di sini = kredensial salah, bukan sesi kadaluarsa: jangan redirect global.
    suppressUnauthorized: true,
  });

  const session = await sessionFromResponse(response);
  if (!session) {
    throw new Error("No token received from authentication service.");
  }

  return session;
}

/**
 * Mendaftarkan akun baru lewat `POST /auth/register`.
 *
 * Mengembalikan `AuthSession` kalau backend langsung membalas token (user
 * otomatis masuk), atau `null` kalau akun dibuat tanpa token — pemanggil harus
 * mengarahkan user ke layar login. Jangan pernah memanggil `/auth/login` di
 * sini: itu bug lama yang membuat pendaftaran seolah berhasil padahal tidak
 * ada akun yang dibuat.
 */
export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<AuthSession | null> {
  try {
    const response = await apiRequest<AuthResponsePayload>("/auth/register", {
      method: "POST",
      body: {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      },
      // Belum ada sesi yang bisa kadaluarsa — jangan picu redirect global.
      suppressUnauthorized: true,
    });

    return await sessionFromResponse(response);
  } catch (error) {
    translateMissingEndpoint(
      error,
      "Pendaftaran akun belum tersedia di server. Hubungi administrator.",
    );
  }
}

/** Meminta email berisi link reset password (`POST /auth/forgot-password`). */
export async function requestPasswordReset(email: string): Promise<string> {
  try {
    const response = await apiRequest<{ message?: string }>(
      "/auth/forgot-password",
      {
        method: "POST",
        body: { email },
        suppressUnauthorized: true,
      },
    );

    return response?.message ?? "Link reset password telah dikirim.";
  } catch (error) {
    translateMissingEndpoint(
      error,
      "Reset password belum tersedia di server. Hubungi administrator.",
    );
  }
}

/**
 * Menyetel password baru memakai token dari email reset
 * (`POST /auth/reset-password`).
 */
export async function resetPassword(params: {
  token: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}): Promise<string> {
  try {
    const response = await apiRequest<{ message?: string }>(
      "/auth/reset-password",
      {
        method: "POST",
        body: {
          token: params.token,
          email: params.email,
          password: params.password,
          password_confirmation: params.passwordConfirmation,
        },
        suppressUnauthorized: true,
      },
    );

    return response?.message ?? "Password berhasil diperbarui.";
  } catch (error) {
    translateMissingEndpoint(
      error,
      "Reset password belum tersedia di server. Hubungi administrator.",
    );
  }
}

export async function logoutFromServer() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch (error) {
    if (error instanceof Error && /401|unauthorized/i.test(error.message)) {
      return;
    }

    throw error;
  }
}

export async function restoreAuthSession(): Promise<AuthSession | null> {
  const stored = await getStoredAuthSession();
  if (!stored?.token) {
    return null;
  }

  try {
    const profile = await apiRequest<{
      user?: Partial<User>;
      role?: string;
      data?: { user?: Partial<User>; role?: string };
    }>("/auth/me", { method: "GET" });
    const userPayload = profile.user ?? profile.data?.user ?? null;
    const role = profile.role ?? profile.data?.role ?? stored.role;
    const user = normalizeUser(userPayload ?? stored.user);

    await persistAuthSession(stored.token, user, role);
    return { token: stored.token, user, role };
  } catch {
    await clearStoredAuthSession();
    return null;
  }
}
