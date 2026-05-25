"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { SearchGlyph, CloseGlyph } from "@/components/ui/glyphs";
import { useCustomerSearch, type CustomerListItem } from "@/lib/hooks";

interface CustomerSearchFieldProps {
  value: CustomerListItem | null;
  onChange: (customer: CustomerListItem | null) => void;
  autoFocus?: boolean;
}

// VISUAL DEVICE: inline search field + result rows + picked card.
//
// Tres estados:
//   - vacío con autofocus → input editorial + lista de resultados live
//   - escribiendo → resultados aparecen abajo, max 5 list rows compactas
//   - elegida → PickedCard (avatar + nombre + meta) con botón "Cambiar"
//
// Cero combobox flotante, cero dropdown. Tipear es la primera acción
// (patrón Linear/Attio "Create"). Los resultados ocupan el flujo
// vertical natural del sheet — no necesitamos un menú overlay.
export function CustomerSearchField({
  value,
  onChange,
  autoFocus,
}: CustomerSearchFieldProps) {
  const [query, setQuery] = React.useState("");
  const search = useCustomerSearch(query.trim(), "name");

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card px-3 py-2.5">
        <Avatar name={`${value.firstName} ${value.lastName}`} size="sm" />
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[13.5px] text-foreground"
            style={{ fontWeight: 540 }}
          >
            {value.firstName} {value.lastName}
          </p>
          {value.email || value.phone ? (
            <p className="truncate text-[11.5px] text-muted-foreground">
              {value.email ?? value.phone}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Cambiar clienta"
        >
          <CloseGlyph className="size-3.5" />
        </button>
      </div>
    );
  }

  const results = (search.data ?? []).slice(0, 5);

  return (
    <div className="space-y-2">
      <label className="flex h-10 items-center gap-2 rounded-lg bg-muted/40 px-3 ring-1 ring-transparent transition-colors focus-within:ring-foreground/15">
        <SearchGlyph className="size-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar clienta por nombre"
          autoFocus={autoFocus}
          className="flex-1 bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground/70 outline-none"
        />
      </label>

      {query.trim().length >= 2 ? (
        search.isLoading ? (
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
            Buscando…
          </p>
        ) : results.length === 0 ? (
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
            Sin coincidencias.
          </p>
        ) : (
          <ul className="space-y-px">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
                    "hover:bg-muted",
                  )}
                >
                  <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-foreground">
                      {c.firstName} {c.lastName}
                    </p>
                    {c.email || c.phone ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {c.email ?? c.phone}
                      </p>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
