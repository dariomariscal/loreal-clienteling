"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScanViewfinder } from "./scan-viewfinder";
import {
  ScanRecentStrip,
  type ScanRecentItem,
} from "./scan-recent-strip";
import { ScanProductSheet } from "./scan-product-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BarcodeGlyph,
  FlashlightGlyph,
  BackGlyph,
} from "@/components/ui/glyphs";
import { ApiError } from "@/lib/api-client";
import {
  useScanLookup,
  useCreateScanEvent,
  useSetScanAction,
  type ScanLookupResult,
} from "@/lib/hooks/use-scans";
import { useCreateSample } from "@/lib/hooks/use-customer-detail";
import {
  useAddWishlistItem,
  useCreateWishlist,
  useCustomerWishlists,
} from "@/lib/hooks/use-wishlists";
import type { ScanActionType } from "@loreal/contracts";

/**
 * The orchestrator behind /advisor/scan. Owns:
 *   – the live camera placeholder + manual-entry barcode input
 *   – the recent-scans session (in-memory only; demo-grade is fine)
 *   – the bottom sheet open/close and its action handlers
 *
 * It deliberately stays UI-side only: the resolution logic lives in
 * `useScanLookup`, the persistence in `useCreateScanEvent`/`useSetScanAction`,
 * and the side-effect mutations in their respective hooks (`useCreateSample`,
 * `useAddWishlistItem`). The stage just wires the gestures.
 *
 * The "demo" camera is a manual input — replacing it with a real barcode
 * library is a drop-in: the stage exposes `onResolveBarcode(barcode)` as the
 * single entry point and the rest of the flow doesn't change.
 */
interface ScanCameraStageProps {
  /**
   * Active customer in the BA session (e.g. from an open visit). When set,
   * every lookup attaches signals (your-shade / replenishment / wishlist) and
   * every action mutation auto-binds to this customer.
   */
  activeCustomer?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
  /**
   * When true and a customer is bound, every successful scan is silently
   * added to that customer's wishlist (auto-provisioning a default wishlist
   * if needed). The product sheet still opens for additional actions.
   *
   * The BA launches /advisor/scan from a customer profile with this flag, so
   * "escanear con la clienta enfrente" is one-tap per product.
   */
  autoAddToWishlist?: boolean;
  /**
   * When provided, the `add_to_cart` action delegates to this callback (e.g.
   * the customer-scoped CartProvider that the profile shell owns) instead of
   * showing the "POS not connected" toast. Returns the running cart count so
   * we can echo it in the success toast.
   */
  onAddToCart?: (item: ScanCartItem) => number;
}

/** Slim shape the scanner can produce from a ScanLookupResult. */
export interface ScanCartItem {
  productId: string;
  sku: string;
  title: string;
  /** String to match the catalog's `price: string` convention. */
  price: string;
  image: string | null;
}

const MAX_RECENT_ITEMS = 6;

export function ScanCameraStage({
  activeCustomer,
  autoAddToWishlist = false,
  onAddToCart,
}: ScanCameraStageProps) {
  const router = useRouter();

  // Lookup machinery
  const lookup = useScanLookup();
  const createScanEvent = useCreateScanEvent();
  const setScanAction = useSetScanAction();
  const createSample = useCreateSample();
  const addWishlistItem = useAddWishlistItem();
  const createWishlist = useCreateWishlist();
  const customerWishlists = useCustomerWishlists(activeCustomer?.id ?? "");

  // Sheet state
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [lastBarcode, setLastBarcode] = React.useState<string | undefined>();
  const [status, setStatus] = React.useState<
    "loading" | "ok" | "not_found" | "out_of_scope" | "error"
  >("loading");
  const [outOfScopeBrand, setOutOfScopeBrand] = React.useState<string>();
  const [currentScanEventId, setCurrentScanEventId] = React.useState<string | null>(
    null,
  );

  // Session-only history of scans — naturally bounded; never persisted.
  const [recent, setRecent] = React.useState<ScanRecentItem[]>([]);
  const recentByVariant = React.useMemo(() => {
    const map = new Map<string, ScanLookupResult>();
    return { map };
  }, []);

  // Manual-entry mode (the demo "camera"); a real barcode lib would call
  // `resolveBarcode` directly from its detection callback.
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualInput, setManualInput] = React.useState("");

  async function resolveBarcode(barcode: string) {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    setLastBarcode(trimmed);
    setStatus("loading");
    setSheetOpen(true);

    try {
      const result = await lookup.mutateAsync({
        barcode: trimmed,
        customerId: activeCustomer?.id,
      });
      setStatus("ok");
      // Persist scan event (best-effort; never blocks the UI).
      const scanEventPromise = createScanEvent
        .mutateAsync({
          variantId: result.variant.id,
          customerId: activeCustomer?.id,
        })
        .then((evt) => {
          setCurrentScanEventId(evt.id);
          return evt.id as string | null;
        })
        .catch(() => null);
      pushRecent(result);

      if (autoAddToWishlist && activeCustomer) {
        // Fire-and-forget: the scan-sheet stays open for more actions, but
        // the wishlist add is the implicit primary intent when the BA
        // launched the scanner from a specific customer profile.
        autoAddScanToWishlist(result, scanEventPromise).catch(() => undefined);
      }
    } catch (err) {
      handleLookupError(err);
    }
  }

  async function autoAddScanToWishlist(
    result: ScanLookupResult,
    scanEventPromise: Promise<string | null>,
  ) {
    if (!activeCustomer) return;
    try {
      let wl = customerWishlists.data?.[0];
      if (!wl) {
        wl = await createWishlist.mutateAsync({
          customerId: activeCustomer.id,
          name: "Wishlist",
        });
      }
      const added = await addWishlistItem.mutateAsync({
        wishlistId: wl.id,
        productId: result.product.id,
        variantId: result.variant.id,
      });
      // Reconcile the scan event with the action we just took so the Today
      // strip's conversion count stays honest.
      const evtId = await scanEventPromise;
      if (evtId) {
        setScanAction
          .mutateAsync({ id: evtId, actionTaken: "add_to_wishlist" })
          .catch(() => undefined);
      }
      if (added.alreadyExists) {
        toast.info(`Ya estaba en la wishlist de ${activeCustomer.firstName}`);
      } else {
        toast.success(`Agregado a wishlist de ${activeCustomer.firstName}`);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No pudimos agregar a wishlist";
      toast.error(message);
    }
  }

  function handleLookupError(err: unknown) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        setStatus("not_found");
        return;
      }
      if (err.status === 403) {
        // ProductLookupService throws ForbiddenException when the variant
        // belongs to a brand outside the BA's scope. The body shape is
        // `{ message: "...", error: "Forbidden" }` — best-effort parse for
        // the brand name when present, or fall through to the generic copy.
        const body = err.body as { brandName?: string } | null;
        setOutOfScopeBrand(body?.brandName ?? "otra marca");
        setStatus("out_of_scope");
        return;
      }
    }
    setStatus("error");
  }

  function pushRecent(result: ScanLookupResult) {
    recentByVariant.map.set(result.variant.id, result);
    setRecent((prev) => {
      const next = prev.filter((r) => r.variantId !== result.variant.id);
      next.unshift({
        variantId: result.variant.id,
        brandName: result.product.brand.displayName,
        productTitle: result.product.title,
        imageUrl: result.variant.imageUrl,
        swatchHex: result.variant.swatchHex,
      });
      return next.slice(0, MAX_RECENT_ITEMS);
    });
  }

  function reopenRecent(variantId: string) {
    const cached = recentByVariant.map.get(variantId);
    if (!cached) return;
    setLastBarcode(cached.variant.barcode ?? cached.variant.sku);
    setStatus("ok");
    setSheetOpen(true);
    // Note: we don't create a new scan event — re-opening from the strip
    // is browsing, not a fresh scan, and double-counting would skew the
    // BA's Today strip.
  }

  // ── Sheet action handlers ─────────────────────────────────────

  async function handleAction(action: ScanActionType) {
    const result = lookup.data;
    if (!result) return;

    // Always record the action against the current scan event so the Today
    // strip can compute conversion.
    if (currentScanEventId) {
      setScanAction
        .mutateAsync({ id: currentScanEventId, actionTaken: action })
        .catch(() => undefined);
    }

    try {
      const outcome = await performAction(action, result);
      if (outcome?.toast) toast.success(outcome.toast);
      if (outcome?.closeSheet !== false) setSheetOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No pudimos completar la acción";
      toast.error(message);
    }
  }

  /** Pretty name for toasts/CTA copy when a customer is bound. */
  function customerLabel(): string {
    if (!activeCustomer) return "";
    return activeCustomer.firstName;
  }

  async function performAction(
    action: ScanActionType,
    result: ScanLookupResult,
  ): Promise<{ toast?: string; closeSheet?: boolean } | void> {
    // Counter-mode actions — work without a customer.
    if (action === "viewed_only") {
      // The "attach to customer" CTA. Jump to the customer list with a
      // query param so the list can offer an "attach scan" affordance.
      const params = new URLSearchParams({
        attachVariant: result.variant.id,
        attachSku: result.variant.sku,
      });
      router.push(`/advisor/customers?${params.toString()}`);
      return { closeSheet: true };
    }
    if (action === "reserve" && !activeCustomer) {
      // Counter-mode reserve — for now, defer to the catalog flow. We could
      // open a store-picker sheet here once that exists.
      toast.info("Próximamente: reservar desde otra tienda");
      return { closeSheet: false };
    }

    if (!activeCustomer) {
      // Any other action without a customer is a no-op the API shouldn't
      // have emitted; bail silently rather than throwing.
      return;
    }

    const who = customerLabel();
    switch (action) {
      case "sample_logged": {
        await createSample.mutateAsync({
          customerId: activeCustomer.id,
          productId: result.product.id,
          variantId: result.variant.id,
        });
        return { toast: `Muestra registrada para ${who}` };
      }
      case "add_to_wishlist": {
        let wl = customerWishlists.data?.[0];
        if (!wl) {
          // Auto-provision a default wishlist on first add. Saves the BA a
          // detour to the profile and matches the Sephora/Tulip pattern.
          wl = await createWishlist.mutateAsync({
            customerId: activeCustomer.id,
            name: "Wishlist",
          });
        }
        const added = await addWishlistItem.mutateAsync({
          wishlistId: wl.id,
          productId: result.product.id,
          variantId: result.variant.id,
        });
        return {
          toast: added.alreadyExists
            ? `Ya estaba en la wishlist de ${who}`
            : `Agregado a wishlist de ${who}`,
        };
      }
      case "send_whatsapp": {
        if (!activeCustomer.phone) {
          throw new Error(`${who} no tiene teléfono registrado`);
        }
        const phone = activeCustomer.phone.replace(/\D/g, "");
        const message = `Hola ${who}, te comparto este producto:\n\n${result.product.brand.displayName} — ${result.product.title}${result.variant.optionLabel ? ` (${result.variant.optionLabel})` : ""}\nSKU ${result.variant.sku}`;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank", "noopener,noreferrer");
        return { toast: `WhatsApp abierto para ${who}` };
      }
      case "shown_to_customer": {
        // The scan event is already updated above via setScanAction. We
        // just give the BA an explicit confirmation that it landed against
        // this customer.
        return { toast: `Registrado: ${who} vio este producto` };
      }
      case "add_to_cart": {
        if (!onAddToCart) {
          // Without a cart sink wired (e.g. scanning outside a customer
          // profile) we can't actually persist the line. Be honest about it.
          toast.info("Próximamente: este flujo aún no está conectado al POS");
          return { closeSheet: false };
        }
        const count = onAddToCart({
          productId: result.product.id,
          sku: result.variant.sku,
          title: result.product.title,
          price: String(result.variant.price),
          image: result.variant.imageUrl,
        });
        return {
          toast: `Agregado al carrito de ${who} (${count})`,
        };
      }
      case "reserve": {
        // Reserve-from-other-store flow isn't built yet; the scan event is
        // logged so the Today strip still reflects intent.
        toast.info("Próximamente: este flujo aún no está conectado al POS");
        return { closeSheet: false };
      }
    }
  }

  /**
   * Rewrites scan-action labels with the active customer's first name so the
   * BA always knows which client the action will land against. Pure function
   * — leaves the result untouched when there's no customer bound.
   */
  function personalizeResult(
    result: ScanLookupResult,
    customer: ScanCameraStageProps["activeCustomer"],
  ): ScanLookupResult {
    if (!customer) return result;
    const who = customer.firstName;
    const rewrite: Partial<Record<ScanActionType, string>> = {
      add_to_wishlist: `Agregar a wishlist de ${who}`,
      sample_logged: `Registrar muestra para ${who}`,
      shown_to_customer: `Registrar que ${who} lo vio`,
      send_whatsapp: `Enviar ficha a ${who} por WhatsApp`,
      add_to_cart: `Agregar a carrito de ${who}`,
      reserve: `Reservar para ${who} en otra tienda`,
    };
    return {
      ...result,
      suggestedActions: result.suggestedActions.map((a) => ({
        ...a,
        label: rewrite[a.type] ?? a.label,
      })),
    };
  }

  const actionPending =
    createSample.isPending ||
    addWishlistItem.isPending ||
    createWishlist.isPending ||
    setScanAction.isPending;

  const personalizedResult =
    status === "ok" && lookup.data
      ? personalizeResult(lookup.data, activeCustomer ?? null)
      : null;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-foreground">
      {/* Top chrome — back + active-customer slot. The ActiveVisitPill the
          shell renders globally provides the canonical customer pill, so we
          only inject a static back button here. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="pointer-events-auto rounded-full bg-foreground/40 text-background hover:bg-foreground/60"
          onClick={() => router.back()}
          aria-label="Atrás"
        >
          <BackGlyph className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="pointer-events-auto rounded-full bg-foreground/40 text-background hover:bg-foreground/60"
          aria-label="Linterna"
        >
          <FlashlightGlyph className="size-5" />
        </Button>
      </div>

      {/* Camera placeholder — production swaps this for a <video> element
          and a barcode detection lib. Tinted backdrop preserves the visual
          weight so the viewfinder mask still reads. */}
      <div className="relative flex-1 bg-gradient-to-b from-foreground/95 via-foreground to-foreground">
        <ScanViewfinder state={lookup.isPending ? "captured" : "scanning"} />

        {/* Manual barcode entry — the bottom controls dock. */}
        <div className="absolute inset-x-0 bottom-0 z-20">
          {recent.length > 0 ? (
            <ScanRecentStrip items={recent} onSelect={reopenRecent} />
          ) : null}

          <div className="flex items-center justify-center gap-2 px-4 pb-6 pt-3">
            {manualOpen ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setManualOpen(false);
                  resolveBarcode(manualInput);
                  setManualInput("");
                }}
                className="flex w-full max-w-sm items-center gap-2"
              >
                <Input
                  autoFocus
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="EAN-13 o SKU"
                  className="bg-background"
                />
                <Button type="submit" size="sm" variant="default">
                  Buscar
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setManualOpen(true)}
                className="rounded-full bg-foreground/40 text-background hover:bg-foreground/60"
              >
                <BarcodeGlyph className="size-4" />
                Escribir SKU
              </Button>
            )}
          </div>
        </div>
      </div>

      <ScanProductSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        result={personalizedResult}
        lastBarcode={lastBarcode}
        activeCustomer={activeCustomer}
        status={status}
        outOfScopeBrand={outOfScopeBrand}
        onAction={handleAction}
        onEnterBarcodeManually={() => {
          setSheetOpen(false);
          setManualOpen(true);
        }}
        onOpenCatalog={() => router.push("/advisor/catalog")}
        actionPending={actionPending}
      />
    </div>
  );
}
