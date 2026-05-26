"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCustomerDensity } from "@/lib/hooks/use-geo";
import { useStores } from "@/lib/hooks/use-stores";
import { CustomerDensityMap } from "@/components/manager/customer-density-map";
import { Button } from "@/components/ui/button";
import { CloseGlyph, MapPinGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

interface Selection {
  municipalityId: string;
  municipalityName: string;
  customerCount: number;
}

/**
 * Full-bleed Tier-3 screen. The choropleth occupies every pixel left by
 * the rail; the metadata + actions live in an unstacked floating panel
 * (top-left) and a contextual bottom-sheet that appears when the user taps
 * a municipality. Mapbox best practice (CARTO/NN-g): legend fixed
 * bottom-left, panel non-modal, never lose map context.
 */
export function HeatmapPage() {
  const { data: geo, isLoading: geoLoading } = useCustomerDensity({
    geojson: true,
    simplify: 0.001,
  });
  const { data: list, isLoading: listLoading } = useCustomerDensity({});
  const { data: stores } = useStores();
  const [selection, setSelection] = useState<Selection | null>(null);

  const totalCustomers = useMemo(() => {
    if (!list || "type" in list) return 0;
    return list.data.reduce((sum, row) => sum + row.customerCount, 0);
  }, [list]);

  const topMunicipalities = useMemo(() => {
    if (!list || "type" in list) return [];
    return list.data.slice(0, 5);
  }, [list]);

  const loading = geoLoading || listLoading;

  return (
    <section className="relative flex h-full min-w-0 flex-1 overflow-hidden bg-background">
      <CustomerDensityMap
        // Type narrowing — geojson:true returns the FeatureCollection.
        data={geo && "type" in geo ? geo : null}
        stores={stores ?? []}
        onMunicipalityClick={setSelection}
        className="flex-1"
      />

      <FloatingOverview
        totalCustomers={totalCustomers}
        topMunicipalities={topMunicipalities}
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

interface OverviewItem {
  municipalityId: string;
  municipalityName: string;
  customerCount: number;
}

function FloatingOverview({
  totalCustomers,
  topMunicipalities,
  loading,
}: {
  totalCustomers: number;
  topMunicipalities: OverviewItem[];
  loading: boolean;
}) {
  return (
    <aside className="pointer-events-none absolute top-4 left-4 w-72 max-w-[calc(100%-2rem)]">
      <div className="pointer-events-auto rounded-xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur">
        <p className="font-[family-name:var(--font-heading)] text-base font-medium text-foreground">
          Mapa de clientas
        </p>
        <p className="text-xs text-muted-foreground">
          Densidad por municipio dentro de tu zona
        </p>

        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total en scope
          </p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tabular-nums text-foreground">
            {loading ? "—" : totalCustomers.toLocaleString("es-MX")}
          </p>
        </div>

        {topMunicipalities.length > 0 ? (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Top municipios
            </p>
            <ul className="mt-2 space-y-1.5">
              {topMunicipalities.map((m, idx) => (
                <li
                  key={m.municipalityId}
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
                      {m.municipalityName}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                    {m.customerCount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
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
            pathname: "/area-manager/customers",
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
