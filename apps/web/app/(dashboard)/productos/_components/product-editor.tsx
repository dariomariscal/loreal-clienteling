"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircleGlyph, BackGlyph } from "@/components/ui/glyphs";
import {
  useBrands,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
} from "@/lib/hooks";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ProductCategory } from "@loreal/contracts";
import { ProductForm, type ProductFormValues } from "./product-form";

interface ProductEditorProps {
  mode: "create" | "edit";
  productId?: string;
}

export function ProductEditor({ mode, productId }: ProductEditorProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const { data: brands = [] } = useBrands();
  const { data: product, isLoading } = useProduct(productId ?? "");
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isPending = createProduct.isPending || updateProduct.isPending;
  const mutationError = createProduct.error ?? updateProduct.error;

  function handleSubmit(data: ProductFormValues) {
    if (isEdit && productId) {
      updateProduct.mutate(
        { id: productId, ...data },
        { onSuccess: () => router.push("/productos") },
      );
    } else {
      createProduct.mutate(data, {
        onSuccess: () => router.push("/productos"),
      });
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-96 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  const defaultValues: Partial<ProductFormValues> | undefined = product
    ? {
        sku: product.sku,
        title: product.title,
        brandId: product.brandId,
        category: product.category as ProductCategory,
        subcategory: product.subcategory ?? undefined,
        description: product.description ?? undefined,
        price: Number(product.price),
        replenishmentDays: product.replenishmentDays ?? undefined,
        images: product.images ?? [],
      }
    : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/productos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <BackGlyph className="size-4" />
        Volver a productos
      </Link>

      <PageHeader
        title={isEdit ? "Editar producto" : "Nuevo producto"}
        description={
          isEdit
            ? "Actualiza la información del producto"
            : "Añade un producto al catálogo con imágenes y detalles"
        }
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/productos")}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" form="product-form" disabled={isPending}>
              {isPending
                ? "Guardando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear producto"}
            </Button>
          </div>
        }
      />

      {mutationError && (
        <Alert variant="destructive">
          <AlertCircleGlyph />
          <AlertTitle>
            No pudimos {isEdit ? "guardar los cambios" : "crear el producto"}
          </AlertTitle>
          <AlertDescription>{mutationError.message}</AlertDescription>
        </Alert>
      )}

      <ProductForm
        defaultValues={defaultValues}
        brands={brands}
        onSubmit={handleSubmit}
        isPending={isPending}
      />
    </div>
  );
}
