import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "./api";
import { secureStorage } from "./secureStorage";

const TOKEN_KEY = "wishlist_token";
const EMAIL_KEY = "wishlist_email";

interface AuthContextValue {
  token: string | null;
  email: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([secureStorage.getItem(TOKEN_KEY), secureStorage.getItem(EMAIL_KEY)]).then(
      ([storedToken, storedEmail]) => {
        setToken(storedToken);
        setEmail(storedEmail);
        setIsLoading(false);
      }
    );
  }, []);

  async function persistSession(newToken: string, newEmail: string) {
    setToken(newToken);
    setEmail(newEmail);
    await Promise.all([secureStorage.setItem(TOKEN_KEY, newToken), secureStorage.setItem(EMAIL_KEY, newEmail)]);
  }

  const value: AuthContextValue = {
    token,
    email,
    isLoading,
    async login(email, password) {
      const res = await api.login(email, password);
      await persistSession(res.token, email);
    },
    async register(email, password) {
      const res = await api.register(email, password);
      await persistSession(res.token, email);
    },
    async logout() {
      setToken(null);
      setEmail(null);
      await Promise.all([secureStorage.removeItem(TOKEN_KEY), secureStorage.removeItem(EMAIL_KEY)]);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
