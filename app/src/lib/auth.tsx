import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "./api";
import { secureStorage } from "./secureStorage";

const TOKEN_KEY = "wishlist_token";

interface AuthContextValue {
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    secureStorage.getItem(TOKEN_KEY).then((stored) => {
      setToken(stored);
      setIsLoading(false);
    });
  }, []);

  async function persistToken(newToken: string) {
    setToken(newToken);
    await secureStorage.setItem(TOKEN_KEY, newToken);
  }

  const value: AuthContextValue = {
    token,
    isLoading,
    async login(email, password) {
      const res = await api.login(email, password);
      await persistToken(res.token);
    },
    async register(email, password) {
      const res = await api.register(email, password);
      await persistToken(res.token);
    },
    async logout() {
      setToken(null);
      await secureStorage.removeItem(TOKEN_KEY);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
