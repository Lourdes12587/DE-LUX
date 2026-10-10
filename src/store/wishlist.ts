"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WishlistState = {
  ids: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set({ ids: get().ids.includes(id) ? get().ids.filter((x) => x !== id) : [...get().ids, id] }),
      remove: (id) => set({ ids: get().ids.filter((x) => x !== id) }),
    }),
    { name: "phenomenon-wishlist" },
  ),
);
