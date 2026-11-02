"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getStoredUser, storeUser } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  ready: boolean; // false until we've read localStorage, to avoid a login-page flash
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setReady(true);
  }, []);

  const login = async (username: string, password: string) => {
    const u = await api.login(username, password);
    storeUser(u);
    setUser(u);
  };

  const logout = () => {
    storeUser(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
