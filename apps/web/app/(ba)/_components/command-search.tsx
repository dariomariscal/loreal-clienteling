"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import {
  PackageGlyph,
  SearchGlyph,
  SparkleDotGlyph,
  UserPlusGlyph,
} from "@/components/ui/glyphs";
import { useCustomerSearch } from "@/lib/hooks";
import { useSemanticSearch } from "@/lib/hooks/use-ai";
import { useProductSemanticSearch } from "@/lib/hooks/use-products";
import type { Customer } from "@/lib/hooks/use-customers";
import type {
  ProductSemanticSearchResult,
  SemanticSearchResult,
} from "@loreal/contracts";

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Linear/Superhuman-style command palette. Anchored to the top of the
// viewport, not centered, so context behind it stays visible. Results
// are grouped (CLIENTAS · POR DESCRIPCIÓN · ACCIONES) — lexical and
// semantic searches run in parallel; lexical wins for keystrokes that
// look like a name, semantic surfaces phrases ("la señora del labial").
export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset query whenever the palette closes so the next open starts fresh —
  // María's mental model is "I open it to find someone", not "I continue".
  React.useEffect(() => {
    if (!open) {
      const id = setTimeout(() => setQuery(""), 150);
      return () => clearTimeout(id);
    }
  }, [open]);

  const trimmed = query.trim();
  const isPhraseLike = trimmed.split(/\s+/).length >= 3;

  const lexical = useCustomerSearch(trimmed, "name");
  const semantic = useSemanticSearch(isPhraseLike ? trimmed : "", 5);
  // Product semantic search runs on phrase-like queries too — same heuristic
  // as customer semantic so the BA gets both worlds when describing intent
  // ("fragancia floral dulce", "algo para arrugas finas").
  const productSemantic = useProductSemanticSearch(
    isPhraseLike ? trimmed : "",
    5,
    { enabled: isPhraseLike },
  );

  const lexicalResults = lexical.data ?? [];
  const semanticResults = semantic.data ?? [];
  const productResults = productSemantic.data ?? [];

  const goToCustomer = React.useCallback(
    (customerId: string) => {
      onOpenChange(false);
      router.push(`/ba/customers/${customerId}`);
    },
    [onOpenChange, router],
  );

  // No BA-side product detail route exists yet — selecting a product just
  // closes the palette so the BA can use the result as visual reference
  // during the consultation. Wire to `/ba/products/:id` when that page lands.
  const dismissAfterProduct = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[2px] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-150" />
        <DialogPrimitive.Popup
          initialFocus={inputRef}
          className={cn(
            "fixed left-1/2 top-[12vh] z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2",
            "overflow-hidden rounded-2xl border border-border/60 bg-background shadow-xl",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.98]",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98]",
            "transition-all duration-150",
          )}
        >
          {/* Input row */}
          <div className="flex items-center gap-2.5 border-b border-border/40 px-4 py-3">
            <SearchGlyph className="size-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar clienta o describirla…"
              className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/70 outline-none"
              autoFocus
            />
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-px font-mono text-[10px] leading-none text-muted-foreground sm:inline-block">
              esc
            </kbd>
          </div>

          {/* Results — three groups, deliberately different visual rhythms */}
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {trimmed.length === 0 ? (
              <EmptyHint />
            ) : (
              <>
                <ResultGroup
                  label="Clientas"
                  isLoading={lexical.isLoading && trimmed.length >= 2}
                  isEmpty={trimmed.length >= 2 && lexicalResults.length === 0 && !lexical.isLoading}
                  emptyText="Sin coincidencias por nombre."
                >
                  {lexicalResults.slice(0, 6).map((customer) => (
                    <LexicalResultRow
                      key={customer.id}
                      customer={customer}
                      onSelect={() => goToCustomer(customer.id)}
                    />
                  ))}
                </ResultGroup>

                {isPhraseLike ? (
                  <ResultGroup
                    label="Por descripción"
                    badge="IA"
                    isLoading={semantic.isFetching}
                    isEmpty={semanticResults.length === 0 && !semantic.isFetching}
                    emptyText="No encontré a nadie por esa descripción."
                  >
                    {semanticResults.map((result) => (
                      <SemanticResultRow
                        key={result.customerId}
                        result={result}
                        onSelect={() => goToCustomer(result.customerId)}
                      />
                    ))}
                  </ResultGroup>
                ) : null}

                {isPhraseLike ? (
                  <ResultGroup
                    label="Productos · por descripción"
                    badge="IA"
                    isLoading={productSemantic.isFetching}
                    isEmpty={
                      productResults.length === 0 && !productSemantic.isFetching
                    }
                    emptyText="No encontré productos para esa descripción."
                  >
                    {productResults.map((result) => (
                      <ProductSemanticResultRow
                        key={result.productId}
                        result={result}
                        onSelect={dismissAfterProduct}
                      />
                    ))}
                  </ResultGroup>
                ) : null}

                <ResultGroup label="Acciones">
                  <ActionRow
                    glyph={<UserPlusGlyph className="size-4 text-muted-foreground" />}
                    label={`Crear clienta nueva${trimmed ? ` "${trimmed}"` : ""}`}
                    onSelect={() => {
                      onOpenChange(false);
                      // The sidebar mounts the sheet — for now we just close
                      // and let the user click the bottom action. A second
                      // pass will wire a `new-customer` URL.
                    }}
                  />
                </ResultGroup>
              </>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ── Result group — labeled, eyebrow-cased, no chrome ────────────────

interface ResultGroupProps {
  label: string;
  badge?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyText?: string;
  children?: React.ReactNode;
}

function ResultGroup({ label, badge, isLoading, isEmpty, emptyText, children }: ResultGroupProps) {
  return (
    <div className="px-2 pb-2 last:pb-1">
      <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        {badge ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ba-accent-soft)] px-1.5 py-px text-[9px] font-medium uppercase tracking-wider text-[var(--ba-accent)]">
            <SparkleDotGlyph className="size-2" />
            {badge}
          </span>
        ) : null}
      </div>
      {isLoading ? (
        <div className="px-2 py-1.5 text-[12px] text-muted-foreground">Buscando…</div>
      ) : isEmpty ? (
        <div className="px-2 py-1.5 text-[12px] text-muted-foreground">{emptyText}</div>
      ) : (
        <ul className="space-y-px">{children}</ul>
      )}
    </div>
  );
}

// ── Result rows — kept as lists (homogeneous, scannable, NN/g rule) ──

function LexicalResultRow({
  customer,
  onSelect,
}: {
  customer: Customer;
  onSelect: () => void;
}) {
  const lastContactLabel = formatDaysAgo(customer.lastContactAt);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
      >
        <Avatar name={`${customer.firstName} ${customer.lastName}`} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-foreground">
            {customer.firstName} {customer.lastName}
          </p>
          {customer.email || customer.phone ? (
            <p className="truncate text-[11px] text-muted-foreground">
              {customer.email ?? customer.phone}
            </p>
          ) : null}
        </div>
        {lastContactLabel ? (
          <span className="text-[11px] text-muted-foreground">{lastContactLabel}</span>
        ) : null}
      </button>
    </li>
  );
}

function SemanticResultRow({
  result,
  onSelect,
}: {
  result: SemanticSearchResult;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
      >
        <Avatar name={`${result.firstName} ${result.lastName}`} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-foreground">
            {result.firstName} {result.lastName}
          </p>
          {result.rationale ? (
            <p className="truncate text-[11px] text-muted-foreground">{result.rationale}</p>
          ) : null}
        </div>
      </button>
    </li>
  );
}

function ProductSemanticResultRow({
  result,
  onSelect,
}: {
  result: ProductSemanticSearchResult;
  onSelect: () => void;
}) {
  const price = Number(result.price);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
          <PackageGlyph className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-foreground">{result.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {[result.brandName, result.subcategory ?? result.category]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {price > 0
            ? `$${price.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`
            : "—"}
        </span>
      </button>
    </li>
  );
}

function ActionRow({
  glyph,
  label,
  onSelect,
}: {
  glyph: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
      >
        {glyph}
        <span className="flex-1 truncate text-[13px] text-foreground">{label}</span>
      </button>
    </li>
  );
}

// ── Empty state — invitation, not error ─────────────────────────────

function EmptyHint() {
  return (
    <div className="px-4 py-6 text-center">
      <p className="text-[13px] text-muted-foreground">
        Escribe un nombre o describe a la clienta.
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground/70">
        Por ejemplo: <span className="italic">"la señora del labial rojo"</span>
      </p>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatDaysAgo(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days}d`;
  if (days < 365) return `hace ${Math.floor(days / 30)}m`;
  return `hace ${Math.floor(days / 365)}a`;
}
