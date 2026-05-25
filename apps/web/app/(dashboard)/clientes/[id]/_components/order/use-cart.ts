"use client";

import * as React from "react";
import type { Product } from "@/lib/hooks";

export interface CartLine {
  product: Product;
  quantity: number;
}

export function useCart() {
  const [cart, setCart] = React.useState<CartLine[]>([]);

  const reset = React.useCallback(() => setCart([]), []);

  const addProduct = React.useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQty = React.useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.product.id !== productId) return [l];
        const next = l.quantity + delta;
        if (next <= 0) return [];
        return [{ ...l, quantity: next }];
      }),
    );
  }, []);

  const removeLine = React.useCallback((productId: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }, []);

  const total = cart.reduce(
    (sum, l) => sum + Number(l.product.price) * l.quantity,
    0,
  );
  const itemCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const selectedIds = React.useMemo(
    () => new Set(cart.map((l) => l.product.id)),
    [cart],
  );

  return {
    cart,
    setCart,
    reset,
    addProduct,
    updateQty,
    removeLine,
    total,
    itemCount,
    selectedIds,
  };
}
