import { setUnauthorizedHandler } from "@/services/api";
import {
    clearStoredAuthSession,
    loginWithEmail,
    logoutFromServer,
    restoreAuthSession,
} from "@/services/authApi";
import { useRouter } from "expo-router";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSessionState = useCallback(() => {
    setUser(null);
    setToken(null);
    setRole(null);
  }, []);

  const handleUnauthorized = useCallback(() => {
    clearSessionState();
    void clearStoredAuthSession();
    router.replace("/login");
  }, [clearSessionState, router]);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await restoreAuthSession();
      if (session) {
        setUser(session.user);
        setToken(session.token);
        setRole(session.role);
      } else {
        clearSessionState();
      }
    } catch {
      clearSessionState();
    } finally {
      setIsLoading(false);
    }
  }, [clearSessionState]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const session = await loginWithEmail(email, password);
      setUser(session.user);
      setToken(session.token);
      setRole(session.role);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const previousToken = token;

    try {
      if (previousToken) {
        await logoutFromServer();
      }
    } catch {
      // Ignore logout API failures and continue the local redirect.
    } finally {
      clearSessionState();
      await clearStoredAuthSession();
      router.replace("/login");
    }
  }, [clearSessionState, router, token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
