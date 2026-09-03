import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "./api";
import { secureStorage } from "./secureStorage";

const TOKEN_KEY = "wishlist_token";
const EMAIL_KEY = "wishlist_email";
const USERNAME_KEY = "wishlist_username";

interface AuthContextValue {
  token: string | null;
  email: string | null;
  username: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      secureStorage.getItem(TOKEN_KEY),
      secureStorage.getItem(EMAIL_KEY),
      secureStorage.getItem(USERNAME_KEY),
    ]).then(([storedToken, storedEmail, storedUsername]) => {
      setToken(storedToken);
      setEmail(storedEmail);
      setUsername(storedUsername);
      setIsLoading(false);
    });
  }, []);

  async function persistSession(newToken: string, newEmail: string, newUsername: string) {
    setToken(newToken);
    setEmail(newEmail);
    setUsername(newUsername);
    await Promise.all([
      secureStorage.setItem(TOKEN_KEY, newToken),
      secureStorage.setItem(EMAIL_KEY, newEmail),
      secureStorage.setItem(USERNAME_KEY, newUsername),
    ]);
  }

  const value: AuthContextValue = {
    token,
    email,
    username,
    isLoading,
    async login(email, password) {
      const res = await api.login(email, password);
      await persistSession(res.token, email, res.username);
    },
    async register(email, username, password) {
      const res = await api.register(email, username, password);
      await persistSession(res.token, email, res.username);
    },
    async updateUsername(username) {
      if (!token) return;
      const res = await api.updateUsername(token, username);
      setUsername(res.username);
      await secureStorage.setItem(USERNAME_KEY, res.username);
    },
    async logout() {
      setToken(null);
      setEmail(null);
      setUsername(null);
      await Promise.all([
        secureStorage.removeItem(TOKEN_KEY),
        secureStorage.removeItem(EMAIL_KEY),
        secureStorage.removeItem(USERNAME_KEY),
      ]);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
