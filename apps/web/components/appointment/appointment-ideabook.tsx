"use client";

import * as React from "react";
import Image from "next/image";
import { SectionCard } from "@/components/advisor/section-card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  useAppointmentPreparedProducts,
  useUpdatePreparedProductStatus,
  useRemovePreparedProduct,
  type PreparedProductWithCatalog,
} from "@/lib/hooks/use-appointment-prepared-products";
import {
  PREPARED_PRODUCT_STATUS_LABEL,
  PREPARED_PRODUCT_STATUS_VARIANT,
} from "@/lib/appointments/labels";
import {
  PREPARED_PRODUCT_STATUSES,
  type PreparedProductStatus,
} from "@loreal/contracts";

interface AppointmentIdeabookProps {
  appointmentId: string;
  /** Read-only after check-out so historical outcomes aren't mutated. */
  readOnly?: boolean;
}

/**
 * "Ideabook" section inside the appointment detail.
 *
 * BSPK/Tulip industry naming. Shows the SKUs the BA pre-pulled for the
 * appointment with their current lifecycle status (prepared → shown → tried →
 * purchased/declined). Each row supports inline status change because that's
 * the action the BA performs the most ("la clienta sí compró este labial").
 *
 * Single responsibility: lists + mutates this appointment's ideabook. Adding
 * new products lives in a separate flow (catalog search) — wired here only
 * as a CTA hint to keep the surface compact.
 */
export function AppointmentIdeabook({
  appointmentId,
  readOnly = false,
}: AppointmentIdeabookProps) {
  const { data: items = [], isLoading } =
    useAppointmentPreparedProducts(appointmentId);

  return (
    <SectionCard
      title="Productos preparados"
      action={
        <span className="text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? "producto" : "productos"}
        </span>
      }
    >
      {isLoading ? (
        <IdeabookSkeleton />
      ) : items.length === 0 ? (
        <EmptyIdeabook />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <IdeabookRow
              key={item.id}
              appointmentId={appointmentId}
              item={item}
              readOnly={readOnly}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// ── Row ───────────────────────────────────────────────────────────

function IdeabookRow({
  appointmentId,
  item,
  readOnly,
}: {
  appointmentId: string;
  item: PreparedProductWithCatalog;
  readOnly: boolean;
}) {
  const updateStatus = useUpdatePreparedProductStatus();
  const remove = useRemovePreparedProduct();

  const thumb = extractThumbnail(item.product?.images);

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            sizes="40px"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.product?.title ?? "Producto"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.note ?? item.product?.sku ?? ""}
        </p>
      </div>

      {readOnly ? (
        <Badge variant={PREPARED_PRODUCT_STATUS_VARIANT[asStatus(item.status)]}>
          {PREPARED_PRODUCT_STATUS_LABEL[asStatus(item.status)]}
        </Badge>
      ) : (
        <Select
          value={item.status}
          onValueChange={(next) => {
            if (!next || next === item.status) return;
            updateStatus.mutate({
              appointmentId,
              id: item.id,
              status: next,
            });
          }}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PREPARED_PRODUCT_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {PREPARED_PRODUCT_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!readOnly ? (
        <button
          type="button"
          aria-label="Quitar producto"
          onClick={() => remove.mutate({ appointmentId, id: item.id })}
          className="text-muted-foreground transition-colors hover:text-destructive"
        >
          <CloseGlyph />
        </button>
      ) : null}
    </li>
  );
}

// ── Pieces ───────────────────────────────────────────────────────

function EmptyIdeabook() {
  return (
    <div className="px-6 py-8 text-center">
      <p className="text-sm text-muted-foreground">
        Aún no hay productos preparados para esta cita.
      </p>
      <p className="mt-1 text-xs text-muted-foreground/80">
        Agrega 3–5 SKUs desde el catálogo para tener listo el ideabook.
      </p>
    </div>
  );
}

function IdeabookSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="size-10 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CloseGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Product.images is jsonb at the boundary so the type is unknown here. Most
 * rows are arrays of urls / { url } — pluck the first usable string.
 */
function extractThumbnail(images: unknown): string | null {
  if (!images) return null;
  if (Array.isArray(images)) {
    for (const entry of images) {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && "url" in entry) {
        const url = (entry as { url?: unknown }).url;
        if (typeof url === "string") return url;
      }
    }
  }
  return null;
}

function asStatus(value: string): PreparedProductStatus {
  return (PREPARED_PRODUCT_STATUSES as readonly string[]).includes(value)
    ? (value as PreparedProductStatus)
    : "prepared";
}
