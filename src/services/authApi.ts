import { apiRequest, AUTH_TOKEN_KEY } from "@/services/api";
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

export async function loginWithEmail(email: string, password: string) {
  const response = await apiRequest<{
    token?: string;
    access_token?: string;
    accessToken?: string;
    user?: Partial<User>;
    role?: string;
    data?: { user?: Partial<User>; role?: string };
  }>("/auth/login", {
    method: "POST",
    body: { email, password },
    // 401 di sini = kredensial salah, bukan sesi kadaluarsa: jangan redirect global.
    suppressUnauthorized: true,
  });

  const token = response.token ?? response.access_token ?? response.accessToken;
  if (!token) {
    throw new Error("No token received from authentication service.");
  }

  const userPayload = response.user ?? response.data?.user ?? null;
  const role =
    response.role ?? response.data?.role ?? userPayload?.role ?? "User";
  const user = normalizeUser(userPayload);
  await persistAuthSession(token, user, role);

  return {
    token,
    user,
    role,
  } satisfies AuthSession;
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
