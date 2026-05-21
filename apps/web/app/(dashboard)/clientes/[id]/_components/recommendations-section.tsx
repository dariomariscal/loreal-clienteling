"use client";

import * as React from "react";
import {
  useCustomerRecommendations,
  useProducts,
  type Recommendation,
  type Product,
} from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TimelineIllustration } from "@/components/ui/illustrations";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  manual: "Manual",
  ai_suggested: "IA",
  replenishment_alert: "Reposición",
};

const SOURCE_VARIANT: Record<string, "default" | "info" | "secondary"> = {
  manual: "default",
  ai_suggested: "info",
  replenishment_alert: "secondary",
};

const VISIT_REASON_LABEL: Record<string, string> = {
  new_purchase: "Nueva compra",
  rebuy: "Recompra",
  gift: "Regalo",
  concern: "Preocupación",
  promotion: "Promoción",
  browsing: "Exploración",
};

interface RecommendationsSectionProps {
  customerId: string;
  onNewRecommendation?: () => void;
}

export function RecommendationsSection({
  customerId,
  onNewRecommendation,
}: RecommendationsSectionProps) {
  const { data: recommendations = [], isLoading } =
    useCustomerRecommendations(customerId);
  // Fetch a page of products so we can render images + names alongside the
  // recommendation rows. The list is small in v1; we can switch to a
  // bulk-by-id endpoint when this gets slow.
  const { data: products = [] } = useProducts({ limit: "200" });
  const productMap = React.useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-border/40 bg-muted/30"
          />
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <EmptyState
        illustration={<TimelineIllustration />}
        title="Sin recomendaciones"
        description="Arma un tablero de productos con justificación para cada uno. Cuando la clienta compre algo recomendado, contará como conversión."
        action={
          onNewRecommendation ? (
            <Button onClick={onNewRecommendation}>Recomendar productos</Button>
          ) : undefined
        }
      />
    );
  }

  // Group by recommendedAt rounded to the minute — recs created together in
  // a single Look Builder submission share the same "consultation" feel.
  const groups = groupByConsultation(recommendations);
  const converted = recommendations.filter((r) => r.convertedToPurchase).length;
  const rate = recommendations.length > 0
    ? Math.round((converted / recommendations.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border/40 bg-muted/20 px-5 py-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Total
          </p>
          <p className="font-heading text-2xl tabular-nums text-foreground">
            {recommendations.length}
          </p>
        </div>
        <div className="flex gap-6 text-right text-xs text-muted-foreground">
          <div>
            <p className="text-[11px] uppercase tracking-wider">Convertidas</p>
            <p className="font-heading text-base text-foreground tabular-nums">
              {converted}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider">Tasa</p>
            <p className="font-heading text-base text-foreground tabular-nums">
              {rate}%
            </p>
          </div>
        </div>
        {onNewRecommendation && (
          <Button size="sm" onClick={onNewRecommendation}>
            Nueva recomendación
          </Button>
        )}
      </div>

      {/* Consultations */}
      <ul className="space-y-4">
        {groups.map((group) => (
          <ConsultationCard
            key={group.key}
            group={group}
            productMap={productMap}
          />
        ))}
      </ul>
    </div>
  );
}

interface ConsultationGroup {
  key: string;
  recommendedAt: string;
  visitReason: string | null;
  source: string;
  items: Recommendation[];
}

function groupByConsultation(
  recs: Recommendation[],
): ConsultationGroup[] {
  const buckets = new Map<string, ConsultationGroup>();

  for (const rec of recs) {
    // Bucket by minute + source + visitReason — manual batches submitted
    // together land in the same bucket; AI suggestions stay separate.
    const minute = rec.recommendedAt.slice(0, 16);
    const key = `${minute}|${rec.source}|${rec.visitReason ?? ""}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.items.push(rec);
    } else {
      buckets.set(key, {
        key,
        recommendedAt: rec.recommendedAt,
        visitReason: rec.visitReason,
        source: rec.source,
        items: [rec],
      });
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) =>
      new Date(b.recommendedAt).getTime() -
      new Date(a.recommendedAt).getTime(),
  );
}

function ConsultationCard({
  group,
  productMap,
}: {
  group: ConsultationGroup;
  productMap: Map<string, Product>;
}) {
  const date = new Date(group.recommendedAt);
  const converted = group.items.filter((i) => i.convertedToPurchase).length;

  return (
    <li className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/30 px-4 py-3">
        <div className="space-y-0.5">
          <p className="font-heading text-[14px] text-foreground">
            {date.toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            ·{" "}
            <span className="text-muted-foreground">
              {date.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {group.items.length} {group.items.length === 1 ? "producto" : "productos"}
            {group.visitReason
              ? ` · ${VISIT_REASON_LABEL[group.visitReason] ?? group.visitReason}`
              : ""}
            {converted > 0
              ? ` · ${converted} convertida${converted === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
        <Badge variant={SOURCE_VARIANT[group.source] ?? "secondary"} size="sm">
          {SOURCE_LABEL[group.source] ?? group.source}
        </Badge>
      </div>

      <ul className="divide-y divide-border/30">
        {group.items.map((rec) => (
          <RecommendationRow
            key={rec.id}
            recommendation={rec}
            product={productMap.get(rec.productId)}
          />
        ))}
      </ul>
    </li>
  );
}

function RecommendationRow({
  recommendation,
  product,
}: {
  recommendation: Recommendation;
  product: Product | undefined;
}) {
  const image = product?.images?.[0];
  const converted = recommendation.convertedToPurchase;

  return (
    <li className="flex gap-3 px-4 py-3">
      <div
        className={cn(
          "relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted/40",
          converted && "ring-2 ring-success",
        )}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {product?.brand?.displayName && (
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {product.brand.displayName}
              </p>
            )}
            <p className="truncate font-heading text-[13px] leading-tight text-foreground">
              {product?.name ?? recommendation.productId}
            </p>
          </div>
          {converted && (
            <Badge variant="success" size="sm">
              Convertida
            </Badge>
          )}
        </div>
        {recommendation.notes && (
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
            “{recommendation.notes}”
          </p>
        )}
      </div>
    </li>
  );
}
