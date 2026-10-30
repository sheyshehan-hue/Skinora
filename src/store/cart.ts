"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  brand: string;
  name: string;
  variantName: string;
  price: number;
  compareAt?: number | null;
  image: string;
  qty: number;
  maxQty: number;
};

type CartState = {
  items: CartItem[];
  open: boolean;
  setOpen: (o: boolean) => void;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  update: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      setOpen: (open) => set({ open }),
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === item.variantId);
          const items = existing
            ? s.items.map((i) => (i.variantId === item.variantId ? { ...i, ...item, qty: Math.min(i.qty + qty, item.maxQty) } : i))
            : [...s.items, { ...item, qty: Math.min(qty, item.maxQty) }];
          return { items, open: true };
        }),
      update: (variantId, qty) => set((s) => ({ items: s.items.map((i) => (i.variantId === variantId ? { ...i, qty: Math.max(1, Math.min(qty, i.maxQty)) } : i)) })),
      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      clear: () => set({ items: [] }),
    }),
    { name: "skinora-cart", partialize: (s) => ({ items: s.items }) },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((s, i) => s + i.qty, 0);
export const cartSubtotal = (items: CartItem[]) => items.reduce((s, i) => s + i.qty * i.price, 0);

export type WishItem = { productId: string; slug: string; brand: string; name: string; price: number; image: string };

type WishState = { items: WishItem[]; toggle: (i: WishItem) => void; has: (id: string) => boolean; remove: (id: string) => void };

export const useWishlist = create<WishState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (i) => set((s) => ({ items: s.items.some((x) => x.productId === i.productId) ? s.items.filter((x) => x.productId !== i.productId) : [i, ...s.items] })),
      has: (id) => get().items.some((x) => x.productId === id),
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.productId !== id) })),
    }),
    { name: "skinora-wishlist" },
  ),
);
