"use client";

import * as React from "react";
import {
  useCustomers,
  useCustomerSearch,
  type Customer,
} from "@/lib/hooks";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SearchGlyph, SpinnerGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

// Industry pattern (Microsoft Dynamics Clienteling, Zenoti, Mindbody):
// search scope = store, with the searching BA's own clients ranked first
// and visually grouped under "Mis clientas". On open, we preload the
// store's most-recent clients so the BA sees something immediately —
// typing then narrows the list.
const MAX_VISIBLE = 8;
const ROW_PX = 56;
const PRELOAD_LIMIT = "30";

export function CustomerPicker({
  staffUserId,
  onPick,
}: {
  staffUserId: string;
  onPick: (c: Customer) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const isSearching = debounced.length >= 2;

  const { data: preload, isLoading: preloadLoading } = useCustomers({
    limit: PRELOAD_LIMIT,
    sortBy: "lastInteractionAt",
    sortOrder: "desc",
  });

  const { data: searchResults = [], isLoading: searchLoading } =
    useCustomerSearch(debounced);

  const customers: Customer[] = isSearching
    ? searchResults
    : preload?.data ?? [];
  const isLoading = isSearching ? searchLoading : preloadLoading;

  const { mine, others } = React.useMemo(() => {
    const mine: Customer[] = [];
    const others: Customer[] = [];
    for (const c of customers) {
      if (c.assignedToUserId === staffUserId) mine.push(c);
      else others.push(c);
    }
    return { mine, others };
  }, [customers, staffUserId]);

  function handlePick(c: Customer) {
    if (!c.id) return;
    setQuery("");
    setDebounced("");
    onPick(c);
  }

  const totalResults = mine.length + others.length;

  return (
    <div className="space-y-2">
      <div className="relative">
        <SearchGlyph className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email…"
          autoFocus
          autoComplete="off"
          className={cn(
            "h-10 w-full rounded-xl border border-border bg-transparent pl-9 pr-9 text-sm outline-none transition-colors",
            "placeholder:text-muted-foreground/50",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
          )}
        />
        {isLoading && (
          <SpinnerGlyph className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isLoading && totalResults === 0 ? (
        <p className="px-1 text-[12px] text-muted-foreground">Cargando…</p>
      ) : totalResults === 0 ? (
        <p className="px-1 text-[12px] text-muted-foreground">
          {isSearching
            ? `Sin coincidencias para "${debounced}".`
            : "No hay clientas registradas."}
        </p>
      ) : (
        <div
          className="overflow-y-auto overscroll-contain rounded-xl border border-border/40 bg-card"
          style={{ maxHeight: `${MAX_VISIBLE * ROW_PX}px` }}
        >
          {mine.length > 0 && (
            <ResultsSection
              title="Mis clientas"
              customers={mine}
              onPick={handlePick}
              highlight
            />
          )}
          {others.length > 0 && (
            <ResultsSection
              title={
                isSearching
                  ? mine.length > 0
                    ? "Otras de la tienda"
                    : "Clientas de la tienda"
                  : mine.length > 0
                    ? "Otras recientes de la tienda"
                    : "Recientes de la tienda"
              }
              customers={others}
              onPick={handlePick}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ResultsSection({
  title,
  customers,
  onPick,
  highlight,
}: {
  title: string;
  customers: Customer[];
  onPick: (c: Customer) => void;
  highlight?: boolean;
}) {
  return (
    <section>
      <header className="sticky top-0 z-10 border-b border-border/30 bg-muted/40 px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur">
        {title}
      </header>
      <ul>
        {customers.map((c, i) => (
          <li key={c.id ?? `idx-${i}`}>
            <button
              type="button"
              onClick={() => onPick(c)}
              disabled={!c.id}
              className={cn(
                "flex w-full items-center gap-3 border-b border-border/20 px-3 py-2 text-left last:border-b-0 transition-colors hover:bg-muted/40 disabled:opacity-50",
                highlight && "bg-accent/[0.03]",
              )}
            >
              <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-foreground">
                  {c.firstName} {c.lastName}
                </p>
                {(c.phone || c.email) && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {c.phone ?? c.email}
                  </p>
                )}
              </div>
              {c.lifecycleStage === "vip" && (
                <Badge variant="success" size="sm">
                  VIP
                </Badge>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PickedCustomerCard({
  customer,
  onChange,
}: {
  customer: Customer;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
      <Avatar
        name={`${customer.firstName} ${customer.lastName}`}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-[14px] text-foreground">
          {customer.firstName} {customer.lastName}
        </p>
        {(customer.phone || customer.email) && (
          <p className="truncate text-[11px] text-muted-foreground">
            {customer.phone ?? customer.email}
          </p>
        )}
      </div>
      {customer.lifecycleStage === "vip" && (
        <Badge variant="success" size="sm">
          VIP
        </Badge>
      )}
      <button
        type="button"
        onClick={onChange}
        className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Cambiar
      </button>
    </div>
  );
}
