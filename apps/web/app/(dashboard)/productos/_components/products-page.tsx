"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProducts, useBrands, type Product } from "@/lib/hooks";
import { can } from "@/lib/permissions";
import { PRODUCT_CATEGORIES } from "@loreal/contracts";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductsIllustration } from "@/components/ui/illustrations";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const CATEGORY_LABEL: Record<string, string> = {
  skincare: "Skincare",
  makeup: "Maquillaje",
  fragrance: "Fragancia",
};

const CATEGORY_VARIANT: Record<string, "info" | "default" | "warning"> = {
  skincare: "info",
  makeup: "default",
  fragrance: "warning",
};

interface ProductsPageProps {
  user: { role?: string | null };
}

export function ProductsPage({ user }: ProductsPageProps) {
  const role = user.role ?? "ba";
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const { data: brands = [] } = useBrands();
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (search) params.search = search;
  if (category) params.category = category;

  const { data: products = [], isLoading } = useProducts(params);
  const brandMap = Object.fromEntries(
    brands.map((b) => [b.id, b.displayName]),
  );

  function handleCreateClick() {
    router.push("/productos/nuevo");
  }

  const showEmptyState =
    products.length === 0 && !isLoading && !search && !category;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Productos"
        description={`${products.length} productos en catálogo`}
        action={
          can(role, "product.create") ? (
            <Button onClick={handleCreateClick}>Nuevo producto</Button>
          ) : undefined
        }
      />

      {!showEmptyState && (
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory((v as string) ?? "");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas las categorías">
                {category ? (CATEGORY_LABEL[category] ?? category) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {PRODUCT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_LABEL[cat] ?? cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-1 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Vista cuadrícula"
            >
              <GridIcon className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Vista lista"
            >
              <ListIcon className="size-4" />
            </button>
          </div>
        </div>
      )}

      {showEmptyState ? (
        <EmptyState
          illustration={<ProductsIllustration className="w-full" />}
          title="Catálogo vacío"
          description="Empieza añadiendo tu primer producto. Podrás subir imágenes, asignarlo a una marca y definir su precio."
          action={
            can(role, "product.create") ? (
              <Button onClick={handleCreateClick}>
                Crear primer producto
              </Button>
            ) : undefined
          }
        />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-card"
            >
              <div className="aspect-square animate-pulse bg-muted" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              brandName={brandMap[product.brandId] ?? ""}
              onClick={() => setPreviewProduct(product)}
              onEdit={
                can(role, "product.edit")
                  ? () => router.push(`/productos/${product.id}/editar`)
                  : undefined
              }
            />
          ))}
          {products.length === 0 && (
            <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
              No se encontraron productos
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Marca</th>
                <th className="px-3 py-2 font-medium">Categoría</th>
                <th className="px-3 py-2 font-medium text-right">Precio</th>
                <th className="px-3 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/20"
                  onClick={() => setPreviewProduct(p)}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {p.sku}
                  </td>
                  <td className="px-3 py-2">{brandMap[p.brandId] ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={CATEGORY_VARIANT[p.category] ?? "secondary"}
                      size="sm"
                    >
                      {CATEGORY_LABEL[p.category] ?? p.category}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    $
                    {Number(p.price).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={p.active ? "success" : "destructive"}
                      size="sm"
                    >
                      {p.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!showEmptyState && (
        <Pagination
          page={page}
          totalPages={Math.ceil(products.length === 20 ? page + 1 : page)}
          onPageChange={setPage}
        />
      )}

      {/* Detail Sheet (read-only) */}
      <Sheet
        open={previewProduct !== null}
        onOpenChange={(open) => !open && setPreviewProduct(null)}
      >
        <SheetContent size="lg">
          {previewProduct && (
            <>
              <SheetHeader>
                <SheetTitle>{previewProduct.name}</SheetTitle>
              </SheetHeader>
              <SheetBody>
                <ProductDetail
                  product={previewProduct}
                  brandName={brandMap[previewProduct.brandId] ?? ""}
                />
              </SheetBody>
              <SheetFooter>
                <SheetClose>
                  <Button variant="outline">Cerrar</Button>
                </SheetClose>
                {can(role, "product.edit") && (
                  <Button
                    onClick={() =>
                      router.push(`/productos/${previewProduct.id}/editar`)
                    }
                  >
                    Editar
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ProductCard({
  product,
  brandName,
  onClick,
  onEdit,
}: {
  product: Product;
  brandName: string;
  onClick: () => void;
  onEdit?: () => void;
}) {
  const imageUrl = product.images?.[0];

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-200 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImagePlaceholder className="size-12 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute left-2 top-2">
          <Badge
            variant={CATEGORY_VARIANT[product.category] ?? "secondary"}
            size="sm"
            className="shadow-sm"
          >
            {CATEGORY_LABEL[product.category] ?? product.category}
          </Badge>
        </div>

        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="absolute right-2 top-2 rounded-lg bg-card/80 p-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
            aria-label="Editar"
          >
            <EditIcon className="size-3.5" />
          </button>
        )}

        {!product.active && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Badge variant="destructive">Inactivo</Badge>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="mb-0.5 text-[11px] text-muted-foreground">
          {brandName}
        </div>
        <h3 className="mb-1 line-clamp-2 text-sm font-medium leading-tight text-foreground">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold tabular-nums">
            $
            {Number(product.price).toLocaleString("es-MX", {
              minimumFractionDigits: 2,
            })}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {product.sku}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProductDetail({
  product,
  brandName,
}: {
  product: Product;
  brandName: string;
}) {
  const imageUrl = product.images?.[0];

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative size-32 shrink-0 overflow-hidden rounded-xl bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImagePlaceholder className="size-8 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="mb-1 text-xs text-muted-foreground">
            {brandName} · {product.sku}
          </div>
          <h3 className="mb-2 text-lg font-semibold">{product.name}</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant={CATEGORY_VARIANT[product.category] ?? "secondary"}>
              {CATEGORY_LABEL[product.category] ?? product.category}
            </Badge>
            {product.subcategory && (
              <Badge variant="secondary">{product.subcategory}</Badge>
            )}
            <Badge variant={product.active ? "success" : "destructive"} size="sm">
              {product.active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">
            $
            {Number(product.price).toLocaleString("es-MX", {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {product.description && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Descripción
          </h4>
          <p className="text-sm">{product.description}</p>
        </div>
      )}

      {product.images && product.images.length > 1 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Galería
          </h4>
          <div className="flex gap-2 overflow-x-auto">
            {product.images.map((img, i) => (
              <div
                key={i}
                className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted"
              >
                <img
                  src={img}
                  alt={`${product.name} ${i + 1}`}
                  className="size-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
