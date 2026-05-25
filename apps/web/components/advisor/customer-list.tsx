"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SearchGlyph } from "@/components/ui/glyphs";
import { CustomerListItem } from "@/components/advisor/customer-list-item";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { useCustomers, useCustomerSearch } from "@/lib/hooks/use-customers";

interface Props {
  activeCustomerId?: string;
}

export function CustomerList({ activeCustomerId }: Props) {
  const [query, setQuery] = useState("");
  const search = useCustomerSearch(query, "name");
  const list = useCustomers({ limit: "100" });

  const isSearching = query.trim().length >= 2;
  const items = isSearching ? search.data ?? [] : list.data?.data ?? [];
  const isLoading = isSearching ? search.isLoading : list.isLoading;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="relative">
          <SearchGlyph
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients"
            className="h-10 pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <AdvisorEmptyState
            title={isSearching ? "No matches" : "No clients yet"}
            description={
              isSearching
                ? "Try a different name or phone."
                : "Clients you create or get assigned will appear here."
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((c) => (
              <li key={c.id}>
                <CustomerListItem
                  customer={c}
                  active={c.id === activeCustomerId}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
