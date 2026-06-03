"use client";

import * as React from "react";

/**
 * Slim shape the cart needs to render lines and submit the order. Both the
 * full Product (catalog picker in OrderSheet) and the trimmed ScanLookupResult
 * (scanner sheet) can produce one of these. Keeping the cart on a minimal
 * shape — instead of forcing a full `Product` — lets the scanner add items
 * without doing a second round-trip to fetch the catalog row.
 */
export interface CartItem {
  productId: string;
  sku: string;
  title: string;
  /** String to preserve the catalog's existing `price: string` convention. */
  price: string;
  image: string | null;
}

export interface CartLine {
  product: CartItem;
  quantity: number;
}

interface CartContextValue {
  cart: CartLine[];
  /** Returns the new total item count after the add, for inline toast echo. */
  addProduct: (item: CartItem) => number;
  updateQty: (productId: string, delta: number) => void;
  removeLine: (productId: string) => void;
  reset: () => void;
  total: number;
  itemCount: number;
  selectedIds: Set<string>;
}

const CartContext = React.createContext<CartContextValue | null>(null);

function storageKey(customerId: string) {
  return `loreal:cart:${customerId}`;
}

function readPersisted(customerId: string): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(storageKey(customerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        l &&
        typeof l === "object" &&
        l.product &&
        typeof l.product.productId === "string" &&
        typeof l.quantity === "number",
    );
  } catch {
    return [];
  }
}

/**
 * Per-customer cart, persisted in sessionStorage so closing the scanner sheet
 * (or the OrderSheet without confirming) doesn't wipe the BA's progress.
 *
 * Scoped per customerId — switching to another customer's profile gives that
 * customer their own fresh cart instead of leaking lines across profiles.
 */
export function CartProvider({
  customerId,
  children,
}: {
  customerId: string;
  children: React.ReactNode;
}) {
  const [cart, setCart] = React.useState<CartLine[]>(() =>
    readPersisted(customerId),
  );

  // Reload from storage when the bound customer changes — guards against the
  // same profile shell remounting with a different id in dev/hot-reload.
  React.useEffect(() => {
    setCart(readPersisted(customerId));
  }, [customerId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (cart.length === 0) {
        window.sessionStorage.removeItem(storageKey(customerId));
      } else {
        window.sessionStorage.setItem(
          storageKey(customerId),
          JSON.stringify(cart),
        );
      }
    } catch {
      // sessionStorage can throw under quota or private-mode restrictions;
      // losing the cart on next reload is acceptable.
    }
  }, [cart, customerId]);

  const addProduct = React.useCallback((item: CartItem): number => {
    let nextCount = 0;
    setCart((prev) => {
      const existing = prev.find((l) => l.product.productId === item.productId);
      const next = existing
        ? prev.map((l) =>
            l.product.productId === item.productId
              ? { ...l, quantity: l.quantity + 1 }
              : l,
          )
        : [...prev, { product: item, quantity: 1 }];
      nextCount = next.reduce((sum, l) => sum + l.quantity, 0);
      return next;
    });
    return nextCount;
  }, []);

  const updateQty = React.useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.product.productId !== productId) return [l];
        const next = l.quantity + delta;
        if (next <= 0) return [];
        return [{ ...l, quantity: next }];
      }),
    );
  }, []);

  const removeLine = React.useCallback((productId: string) => {
    setCart((prev) => prev.filter((l) => l.product.productId !== productId));
  }, []);

  const reset = React.useCallback(() => setCart([]), []);

  const total = cart.reduce(
    (sum, l) => sum + Number(l.product.price) * l.quantity,
    0,
  );
  const itemCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const selectedIds = React.useMemo(
    () => new Set(cart.map((l) => l.product.productId)),
    [cart],
  );

  const value: CartContextValue = {
    cart,
    addProduct,
    updateQty,
    removeLine,
    reset,
    total,
    itemCount,
    selectedIds,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCustomerCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) {
    throw new Error("useCustomerCart must be used inside a <CartProvider>");
  }
  return ctx;
}
