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
import { useAddWishlistItem, useCustomerWishlists } from "@/lib/hooks/use-wishlists";
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
    avatarUrl?: string | null;
  } | null;
}

const MAX_RECENT_ITEMS = 6;

export function ScanCameraStage({ activeCustomer }: ScanCameraStageProps) {
  const router = useRouter();

  // Lookup machinery
  const lookup = useScanLookup();
  const createScanEvent = useCreateScanEvent();
  const setScanAction = useSetScanAction();
  const createSample = useCreateSample();
  const addWishlistItem = useAddWishlistItem();
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
      createScanEvent
        .mutateAsync({
          variantId: result.variant.id,
          customerId: activeCustomer?.id,
        })
        .then((evt) => setCurrentScanEventId(evt.id))
        .catch(() => {
          // The scan still happened; we just can't reconcile actionTaken
          // later. The Today strip will undercount — acceptable.
        });
      pushRecent(result);
    } catch (err) {
      handleLookupError(err);
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
      await performAction(action, result);
      toast.success("Listo");
      setSheetOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No pudimos completar la acción";
      toast.error(message);
    }
  }

  async function performAction(
    action: ScanActionType,
    result: ScanLookupResult,
  ): Promise<void> {
    if (!activeCustomer) {
      // Without a customer, the only actions the API ever returns are
      // viewed_only / attribute-to-customer — both are no-ops here.
      return;
    }

    switch (action) {
      case "sample_logged": {
        await createSample.mutateAsync({
          customerId: activeCustomer.id,
          productId: result.product.id,
          variantId: result.variant.id,
        });
        return;
      }
      case "add_to_wishlist": {
        const wl = customerWishlists.data?.[0];
        if (!wl) {
          // No wishlist yet — defer to the profile flow. The toast tells the
          // BA where to go; the sheet stays open.
          throw new Error("Aún no tiene wishlist. Créala desde su perfil.");
        }
        await addWishlistItem.mutateAsync({
          wishlistId: wl.id,
          productId: result.product.id,
          variantId: result.variant.id,
        });
        return;
      }
      case "add_to_cart":
      case "reserve":
      case "send_whatsapp":
      case "shown_to_customer":
      case "viewed_only": {
        // These either navigate the BA to a richer flow (cart/whatsapp) or
        // need no side-effect beyond the scan event itself. For the demo
        // we record and dismiss; productionizing each is a follow-up.
        return;
      }
    }
  }

  const actionPending =
    createSample.isPending ||
    addWishlistItem.isPending ||
    setScanAction.isPending;

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
        result={status === "ok" ? lookup.data ?? null : null}
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
