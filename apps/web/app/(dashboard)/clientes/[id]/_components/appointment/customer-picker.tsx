"use client";

import * as React from "react";
import { useCustomerSearch, type Customer } from "@/lib/hooks";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CustomerPicker({ onPick }: { onPick: (c: Customer) => void }) {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results = [], isLoading } = useCustomerSearch(debounced);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nombre, teléfono o email…"
        autoFocus
        className={cn(
          "h-10 w-full rounded-xl border border-border bg-transparent px-3.5 text-sm outline-none transition-colors",
          "placeholder:text-muted-foreground/50",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
        )}
      />
      {debounced.length >= 2 ? (
        <ul className="max-h-56 overflow-y-auto rounded-xl border border-border/40 bg-card">
          {isLoading ? (
            <li className="px-3 py-2 text-[12px] text-muted-foreground">
              Buscando…
            </li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-[12px] text-muted-foreground">
              Sin coincidencias para "{debounced}".
            </li>
          ) : (
            results.slice(0, 8).map((c, i) => (
              <li key={c.id ?? `idx-${i}`}>
                <button
                  type="button"
                  onClick={() => c.id && onPick(c)}
                  disabled={!c.id}
                  className="flex w-full items-center gap-3 border-b border-border/30 px-3 py-2 text-left last:border-b-0 hover:bg-muted/40 disabled:opacity-50"
                >
                  <Avatar
                    name={`${c.firstName} ${c.lastName}`}
                    size="sm"
                  />
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
                  {c.lifecycleSegment === "vip" && (
                    <Badge variant="success" size="sm">
                      VIP
                    </Badge>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
        <p className="text-[12px] text-muted-foreground">
          Escribe al menos 2 caracteres para buscar.
        </p>
      )}
    </div>
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
      {customer.lifecycleSegment === "vip" && (
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
