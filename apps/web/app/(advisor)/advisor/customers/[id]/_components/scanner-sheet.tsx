"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScanCameraStage } from "@/components/scan/scan-camera-stage";
import { useCustomerCart } from "./order/cart-context";

interface ScannerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  };
}

/**
 * In-context scanner. Opens as a right-side sheet over the customer 360 so the
 * profile context (sidebar, tabs, identity panel) stays anchored behind and
 * the global advisor sidebar never bleeds in — the way it would if we routed
 * to the standalone /advisor/scan page from here.
 *
 * The stage is configured with `autoAddToWishlist`, matching the implicit
 * intent of "estoy con esta clienta y escaneo un producto" — every successful
 * scan lands on her wishlist with a single toast.
 */
export function ScannerSheet({ open, onOpenChange, customer }: ScannerSheetProps) {
  const { addProduct } = useCustomerCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="lg"
        showCloseButton={false}
        className="flex flex-col gap-0 bg-foreground p-0"
      >
        <SheetTitle className="sr-only">
          Escáner para {customer.firstName}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Cada producto escaneado se agrega automáticamente a la wishlist de{" "}
          {customer.firstName}.
        </SheetDescription>
        <ScanCameraStage
          activeCustomer={customer}
          autoAddToWishlist
          onAddToCart={(item) => addProduct(item)}
        />
      </SheetContent>
    </Sheet>
  );
}
