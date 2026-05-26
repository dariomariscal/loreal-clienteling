"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCustomerDensity } from "@/lib/hooks/use-geo";
import { useStores } from "@/lib/hooks/use-stores";
import { CustomerDensityMap } from "@/components/manager/customer-density-map";
import { CloseGlyph, HeatmapGlyph, MapPinGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

type Granularity = "state" | "municipality";

interface Selection {
  municipalityId: string;
  municipalityName: string;
  customerCount: number;
}

/**
 * National heatmap. Full-bleed Tier-3 canvas centered on Mexico. Differs
 * from the AM version in three ways:
 *
 *   1. Map starts wide enough to fit the whole country.
 *   2. Floating overview cycles between "Top estados" and "Top municipios"
 *      via a small segmented control — the same data, two roll-ups, no
 *      extra backend call. Estado roll-up is computed client-side from the
 *      same density list the choropleth uses.
 *   3. Selection sheet links to /national/customers?municipalityId= to drill
 *      into the customers behind a polygon.
 */
export function NationalHeatmapPage() {
  const { data: geo, isLoading: geoLoading } = useCustomerDensity({
    geojson: true,
    simplify: 0.001,
  });
  const { data: list, isLoading: listLoading } = useCustomerDensity({});
  const { data: stores } = useStores();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [granularity, setGranularity] = useState<Granularity>("state");

  const rows = list && "data" in list ? list.data : [];

  const totalCustomers = useMemo(
    () => rows.reduce((sum, row) => sum + row.customerCount, 0),
    [rows],
  );

  const topMunicipalities = useMemo(() => rows.slice(0, 5), [rows]);

  // Roll up by state — same payload, no extra fetch.
  const topStates = useMemo(() => {
    const byState = new Map<
      string,
      { stateCode: string; stateName: string; customerCount: number }
    >();
    for (const row of rows) {
      const existing = byState.get(row.stateCode);
      if (existing) {
        existing.customerCount += row.customerCount;
      } else {
        byState.set(row.stateCode, {
          stateCode: row.stateCode,
          stateName: row.stateName,
          customerCount: row.customerCount,
        });
      }
    }
    return Array.from(byState.values())
      .sort((a, b) => b.customerCount - a.customerCount)
      .slice(0, 5);
  }, [rows]);

  const loading = geoLoading || listLoading;

  return (
    <section className="relative flex h-full min-w-0 flex-1 overflow-hidden bg-background">
      <CustomerDensityMap
        data={geo && "type" in geo ? geo : null}
        stores={stores ?? []}
        onMunicipalityClick={setSelection}
        className="flex-1"
        initialCenter={[-102, 23.5]}
        initialZoom={4.5}
      />

      <FloatingOverview
        totalCustomers={totalCustomers}
        topMunicipalities={topMunicipalities}
        topStates={topStates}
        granularity={granularity}
        onGranularityChange={setGranularity}
        loading={loading}
      />

      {selection ? (
        <SelectionSheet
          selection={selection}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </section>
  );
}

// ── Floating top-left overview ─────────────────────────────────────

function FloatingOverview({
  totalCustomers,
  topMunicipalities,
  topStates,
  granularity,
  onGranularityChange,
  loading,
}: {
  totalCustomers: number;
  topMunicipalities: { municipalityId: string; municipalityName: string; customerCount: number }[];
  topStates: { stateCode: string; stateName: string; customerCount: number }[];
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  loading: boolean;
}) {
  const items =
    granularity === "state"
      ? topStates.map((s) => ({
          id: s.stateCode,
          name: s.stateName,
          count: s.customerCount,
        }))
      : topMunicipalities.map((m) => ({
          id: m.municipalityId,
          name: m.municipalityName,
          count: m.customerCount,
        }));

  return (
    <aside className="pointer-events-none absolute top-4 left-4 w-80 max-w-[calc(100%-2rem)]">
      <div className="pointer-events-auto rounded-xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--ba-accent-soft,oklch(0.96_0.018_38))] text-[color:var(--ba-accent)]">
            <HeatmapGlyph className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-heading)] text-base font-medium text-foreground">
              Mapa nacional
            </p>
            <p className="text-xs text-muted-foreground">
              Densidad de clientas en toda la división
            </p>
          </div>
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total en la división
          </p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tabular-nums text-foreground">
            {loading ? "—" : totalCustomers.toLocaleString("es-MX")}
          </p>
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Top {granularity === "state" ? "estados" : "municipios"}
            </p>
            <GranularitySwitch
              value={granularity}
              onChange={onGranularityChange}
            />
          </div>
          {items.length === 0 ? (
            <p className="px-1 py-3 text-xs text-muted-foreground">
              Sin datos suficientes para esta vista.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((item, idx) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                        idx < 3
                          ? "bg-[color:var(--ba-accent)] text-[color:var(--ba-accent-foreground)]"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate text-xs text-foreground">
                      {item.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                    {item.count.toLocaleString("es-MX")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

function GranularitySwitch({
  value,
  onChange,
}: {
  value: Granularity;
  onChange: (g: Granularity) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Granularidad"
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
    >
      <SwitchButton active={value === "state"} onClick={() => onChange("state")}>
        Estado
      </SwitchButton>
      <SwitchButton
        active={value === "municipality"}
        onClick={() => onChange("municipality")}
      >
        Municipio
      </SwitchButton>
    </div>
  );
}

function SwitchButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? "rounded-sm bg-foreground px-2 py-0.5 text-[10px] font-medium text-background"
          : "rounded-sm px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}

// ── Bottom-sheet on municipality click ─────────────────────────────

function SelectionSheet({
  selection,
  onClose,
}: {
  selection: Selection;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={`Detalle de ${selection.municipalityName}`}
      className="absolute right-4 bottom-4 left-4 sm:left-auto sm:w-96 rounded-xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <MapPinGlyph className="size-4 text-[color:var(--ba-accent)]" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Municipio
            </p>
          </div>
          <p className="mt-1 truncate font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">
            {selection.municipalityName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">
              {selection.customerCount}
            </span>{" "}
            {selection.customerCount === 1 ? "clienta" : "clientas"} registradas
            en este municipio
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="-mr-1 -mt-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <CloseGlyph className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={{
            pathname: "/national/customers",
            query: { municipalityId: selection.municipalityId },
          }}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted/40"
        >
          Ver clientas
        </Link>
      </div>
    </div>
  );
}
