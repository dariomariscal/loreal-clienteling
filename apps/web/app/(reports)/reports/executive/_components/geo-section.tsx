"use client";

import * as React from "react";
import { getMapboxToken } from "@/lib/hooks/use-geocoding";
import type { ZoneHeatmapResponse } from "@loreal/contracts";
import { BriefingSection, RankingTable } from "./primitives";

/* ============================================================================
   Geographic distribution — print-safe map page.
   ============================================================================
   Uses the Mapbox Static Images API (PNG over HTTP) so the page renders as an
   <img> that prints reliably. Pin radius encodes sell-out in the period; the
   top 3 municipalities get the L'Oréal red accent so the eye lands on them
   first. A side ranking table backs the map with exact numbers.

   GL JS is intentionally avoided here — WebGL canvases don't print
   consistently across browsers (window.print() often outputs a blank tile).
   ============================================================================ */

interface GeoSectionProps {
  data: ZoneHeatmapResponse | undefined;
  isLoading: boolean;
}

const ACCENT = "#E30613";
const INK = "#1A1A1A";

export function GeoSection({ data, isLoading }: GeoSectionProps) {
  const token = getMapboxToken();
  const rows = React.useMemo(() => {
    return (data?.data ?? [])
      .filter((r) => r.lat != null && r.lng != null && r.salesAmount > 0)
      .sort((a, b) => b.salesAmount - a.salesAmount);
  }, [data]);

  if (isLoading) return null;
  // Hide the section when role/scope returns no geo data — Counter/BA briefs
  // simply won't have this page.
  if (!token || rows.length === 0) return null;

  const top15 = rows.slice(0, 15);
  const topTotal = top15.reduce((s, r) => s + r.salesAmount, 0);
  const grandTotal = rows.reduce((s, r) => s + r.salesAmount, 0);
  const top3 = top15.slice(0, 3);
  const top3Share = grandTotal > 0
    ? top3.reduce((s, r) => s + r.salesAmount, 0) / grandTotal
    : 0;

  const mapUrl = buildMapboxStaticUrl({
    token,
    rows: top15,
  });

  const formatMoneyCompact = (value: number) => {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${Math.round(value)}`;
  };
  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const topMuni = top15[0];

  return (
    <BriefingSection
      index="06"
      eyebrow="Distribución Geográfica"
      title={
        topMuni
          ? `${topMuni.name ?? "Municipio principal"} concentra ${((topMuni.salesAmount / Math.max(grandTotal, 1)) * 100).toFixed(0)}% del sell-out en ${rows.length} municipios activos`
          : "Distribución geográfica del sell-out"
      }
      caption={`Top 15 municipios visualizados · ${formatMoney(topTotal)} (${((topTotal / Math.max(grandTotal, 1)) * 100).toFixed(0)}% del total)`}
    >
      <div className="grid grid-cols-12 gap-5">
        {/* Map (8 cols) */}
        <div className="col-span-8">
          <div
            className="briefing-no-break overflow-hidden border"
            style={{ borderColor: "#E8E5DD" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mapUrl}
              alt={`Mapa de sell-out por municipio · top ${top15.length}`}
              className="block h-auto w-full"
              loading="eager"
            />
          </div>
          <div
            className="mt-3 flex items-center gap-4 text-[10px]"
            style={{ color: "#6B6B6B" }}
          >
            <Legend color={ACCENT} label="Top 3 municipios" />
            <Legend color={INK} label="Resto del top 15" />
            <span className="ml-auto">Tamaño del pin ∝ sell-out</span>
          </div>
        </div>

        {/* Side ranking (4 cols) */}
        <div className="col-span-4">
          <h3
            className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{ color: "#6B6B6B" }}
          >
            Top 10 por sell-out
          </h3>
          <RankingTable
            rows={top15.slice(0, 10)}
            rowKey={(r) => r.municipalityId}
            columns={[
              {
                key: "name",
                label: "Municipio",
                align: "left",
                render: (r) => (
                  <div>
                    <div className="font-medium leading-tight">
                      {r.name ?? "—"}
                    </div>
                    <div className="text-[9px] text-neutral-500">
                      {r.stateName ?? ""}
                    </div>
                  </div>
                ),
              },
              {
                key: "amount",
                label: "Sell-out",
                align: "right",
                render: (r) => formatMoneyCompact(r.salesAmount),
                bar: (r) => ({
                  value: r.salesAmount,
                  max: top15[0]?.salesAmount ?? 1,
                }),
              },
            ]}
          />
        </div>
      </div>

      {/* Findings strip */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <Finding
          label="Concentración top 3"
          value={`${(top3Share * 100).toFixed(0)}%`}
          helper={`${top3.map((r) => r.name ?? "—").join(" · ")}`}
        />
        <Finding
          label="Municipios activos"
          value={rows.length.toString()}
          helper={`${rows.filter((r) => r.newCustomersInPeriod > 0).length} con registros nuevos en el período`}
        />
        <Finding
          label="Clientes nuevos en mapa"
          value={top15
            .reduce((s, r) => s + r.newCustomersInPeriod, 0)
            .toLocaleString("es-MX")}
          helper="Sumando todos los municipios del top 15"
        />
      </div>
    </BriefingSection>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block size-2 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function Finding({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div
      className="briefing-no-break border p-4"
      style={{ borderColor: "#E8E5DD" }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>
      <p
        className="mt-1 text-[24px] font-semibold tabular-nums tracking-[-0.01em]"
        style={{ color: INK }}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-snug" style={{ color: "#6B6B6B" }}>
        {helper}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Mapbox Static Images URL builder
// ─────────────────────────────────────────────────────────────────────

interface MapboxRow {
  municipalityId: string;
  lat: number | null;
  lng: number | null;
  salesAmount: number;
  name: string | null;
}

/**
 * Builds a Mapbox Static Images API URL for the top municipalities.
 *
 * Encoding:
 *   - Pin size: 's' (small), 'm' (medium), 'l' (large) → proportional to
 *     sell-out using tertile thresholds.
 *   - Pin color: top 3 in L'Oréal red, rest in ink.
 *   - Center + zoom: computed from the bounding box of the pins so all fit.
 *
 * Returns a `/styles/v1/mapbox/light-v11/static/...` URL with `@2x` for
 * crisp print output.
 */
function buildMapboxStaticUrl({
  token,
  rows,
}: {
  token: string;
  rows: MapboxRow[];
}): string {
  const validRows = rows.filter(
    (r): r is MapboxRow & { lat: number; lng: number } =>
      typeof r.lat === "number" && typeof r.lng === "number",
  );
  if (validRows.length === 0) {
    // Mapbox requires at least one overlay or a center/zoom — fall back to MX
    // bounding box so the URL still renders something sensible.
    return `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/-99.13,19.43,4.5/1000x560@2x?access_token=${token}`;
  }

  // Tertile thresholds for pin size.
  const sortedAmounts = validRows
    .map((r) => r.salesAmount)
    .sort((a, b) => b - a);
  const t1 = sortedAmounts[Math.floor(sortedAmounts.length / 3)] ?? 0;
  const t2 = sortedAmounts[Math.floor((sortedAmounts.length * 2) / 3)] ?? 0;
  const sizeFor = (amount: number) =>
    amount >= t1 ? "l" : amount >= t2 ? "m" : "s";

  const ACCENT_HEX = "E30613";
  const INK_HEX = "1A1A1A";

  // Build pin markers — Mapbox limits URL length, top 15 is well under.
  const pins = validRows
    .slice(0, 15)
    .map((r, i) => {
      const size = sizeFor(r.salesAmount);
      const color = i < 3 ? ACCENT_HEX : INK_HEX;
      // pin-{size}+{hex}({lng},{lat})
      return `pin-${size}+${color}(${r.lng.toFixed(4)},${r.lat.toFixed(4)})`;
    })
    .join(",");

  // Mapbox `auto` mode picks a center + zoom that fits all overlays — exactly
  // what we want without computing the bbox ourselves.
  const url =
    `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/` +
    `${pins}/auto/1000x560@2x` +
    `?access_token=${encodeURIComponent(token)}` +
    `&padding=40`;

  return url;
}
