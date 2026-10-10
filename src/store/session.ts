"use client";

import { create } from "zustand";
import { api } from "@/lib/api";

export type SessionUser = { id: string; email: string; name: string | null; role: "CUSTOMER" | "EDITOR" | "ADMIN" };

type SessionState = {
  status: "unknown" | "loading" | "authenticated" | "anonymous";
  user: SessionUser | null;
  /** Fetches /api/auth/me once (or again with force). The cookie is httpOnly, so the browser can't read it directly. */
  load: (force?: boolean) => Promise<void>;
  setUser: (user: SessionUser | null) => void;
  signOut: () => Promise<void>;
};

export const useSession = create<SessionState>()((set, get) => ({
  status: "unknown",
  user: null,
  load: async (force) => {
    if (!force && get().status !== "unknown") return;
    set({ status: "loading" });
    try {
      const { user } = await api<{ user: SessionUser | null }>("/api/auth/me");
      set({ user, status: user ? "authenticated" : "anonymous" });
    } catch {
      set({ user: null, status: "anonymous" });
    }
  },
  setUser: (user) => set({ user, status: user ? "authenticated" : "anonymous" }),
  signOut: async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    set({ user: null, status: "anonymous" });
  },
}));

export const firstName = (u: SessionUser | null) => u?.name?.split(" ")[0] ?? null;
