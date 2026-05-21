"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import {
  SearchIcon,
  UserIcon,
  PackageIcon,
  StoreIcon,
  Loader2Icon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  useCustomerSearch,
  useProducts,
  useStores,
} from "@/lib/hooks";

interface SearchResult {
  type: "customer" | "product" | "store";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const debouncedQuery = useDebouncedValue(query, 200);
  const trimmed = debouncedQuery.trim();
  const isActive = trimmed.length >= 2;

  const customerSearch = useCustomerSearch(isActive ? trimmed : "");
  const productSearch = useProducts(
    isActive ? { search: trimmed, limit: "5" } : undefined,
  );
  const storeSearch = useStores();

  const results = React.useMemo<SearchResult[]>(() => {
    if (!isActive) return [];

    const customers = (customerSearch.data ?? []).slice(0, 5).map((c) => ({
      type: "customer" as const,
      id: c.id,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: c.email ?? c.phone ?? undefined,
      href: `/clientes/${c.id}`,
    }));

    const products = (productSearch.data ?? []).slice(0, 5).map((p) => ({
      type: "product" as const,
      id: p.id,
      title: p.name,
      subtitle: p.sku,
      href: `/productos/${p.id}/editar`,
    }));

    const lower = trimmed.toLowerCase();
    const stores = (storeSearch.data ?? [])
      .filter(
        (s) =>
          s.displayName.toLowerCase().includes(lower) ||
          s.code.toLowerCase().includes(lower),
      )
      .slice(0, 5)
      .map((s) => ({
        type: "store" as const,
        id: s.id,
        title: s.displayName,
        subtitle: s.code,
        href: `/tiendas`,
      }));

    return [...customers, ...products, ...stores];
  }, [
    isActive,
    customerSearch.data,
    productSearch.data,
    storeSearch.data,
    trimmed,
  ]);

  const isLoading =
    isActive && (customerSearch.isFetching || productSearch.isFetching);

  React.useEffect(() => {
    if (isActive && results.length > 0) setOpen(true);
  }, [isActive, results.length]);

  // "/" focuses the input (skipping when typing inside another input)
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleSelect(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function groupResults(items: SearchResult[]) {
    return items.reduce(
      (acc, item) => {
        acc[item.type] = acc[item.type] ?? [];
        acc[item.type]!.push(item);
        return acc;
      },
      {} as Record<SearchResult["type"], SearchResult[] | undefined>,
    );
  }

  const grouped = groupResults(results);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div ref={anchorRef} className="relative w-full max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => isActive && setOpen(true)}
          placeholder="Buscar clientes, productos, tiendas..."
          className="h-8 w-full rounded-xl border border-input bg-muted/30 pl-8 pr-12 text-sm outline-none transition-all duration-200 hover:border-foreground/20 placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-block">
          /
        </kbd>
      </div>
      <Popover.Portal>
        <Popover.Positioner anchor={anchorRef} sideOffset={6} className="z-50">
          <Popover.Popup className="w-(--anchor-width) min-w-[340px] overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg ring-1 ring-foreground/6 outline-none">
            {isLoading && results.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Buscando...
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Sin resultados para &quot;{trimmed}&quot;
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto p-1">
                <ResultGroup
                  label="Clientes"
                  icon={UserIcon}
                  items={grouped.customer}
                  onSelect={handleSelect}
                />
                <ResultGroup
                  label="Productos"
                  icon={PackageIcon}
                  items={grouped.product}
                  onSelect={handleSelect}
                />
                <ResultGroup
                  label="Tiendas"
                  icon={StoreIcon}
                  items={grouped.store}
                  onSelect={handleSelect}
                />
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface ResultGroupProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: SearchResult[];
  onSelect: (href: string) => void;
}

function ResultGroup({ label, icon: Icon, items, onSelect }: ResultGroupProps) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
        {label}
      </p>
      {items.map((item) => (
        <button
          key={`${item.type}-${item.id}`}
          type="button"
          onClick={() => onSelect(item.href)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
          )}
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">
            <span className="block font-medium">{item.title}</span>
            {item.subtitle && (
              <span className="block truncate text-xs text-muted-foreground">
                {item.subtitle}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
