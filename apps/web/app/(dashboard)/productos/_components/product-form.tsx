"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PRODUCT_CATEGORIES } from "@loreal/contracts";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ProductImageGallery } from "./product-image-gallery";
import type { Brand } from "@/lib/hooks";

const CATEGORY_LABEL: Record<string, string> = {
  skincare: "Skincare",
  makeup: "Maquillaje",
  fragrance: "Fragancia",
};

const productFormSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  brandId: z.string().uuid(),
  category: z.enum(PRODUCT_CATEGORIES as [string, ...string[]]),
  subcategory: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().positive(),
  estimatedDurationDays: z.coerce.number().int().positive().optional(),
  images: z.array(z.string().url()),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  brands: Brand[];
  onSubmit: (data: ProductFormValues) => void;
  isPending: boolean;
}

export function ProductForm({
  defaultValues,
  brands,
  onSubmit,
  isPending,
}: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      sku: defaultValues?.sku ?? "",
      name: defaultValues?.name ?? "",
      brandId: defaultValues?.brandId ?? "",
      category: defaultValues?.category ?? PRODUCT_CATEGORIES[0],
      subcategory: defaultValues?.subcategory ?? "",
      description: defaultValues?.description ?? "",
      price: defaultValues?.price ?? (0 as unknown as number),
      estimatedDurationDays: defaultValues?.estimatedDurationDays,
      images: defaultValues?.images ?? [],
    },
  });

  const brandOptions = brands.map((b) => ({
    value: b.id,
    label: b.displayName,
    description: b.code,
  }));

  const categoryOptions = PRODUCT_CATEGORIES.map((cat) => ({
    value: cat,
    label: CATEGORY_LABEL[cat] ?? cat,
  }));

  function handleSubmit(data: ProductFormValues) {
    onSubmit({
      ...data,
      description: data.description || undefined,
      subcategory: data.subcategory || undefined,
      images: data.images.length > 0 ? data.images : [],
    });
  }

  return (
    <Form {...form}>
      <form
        id="product-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-row items-start gap-6"
      >
        {/* Primary column — Polaris "Resource details" pattern */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información del producto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Advanced Génifique Sérum"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        rows={4}
                        placeholder="Tratamiento de skincare premium..."
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>Multimedia</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ProductImageGallery
                        folder="products"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isPending}
                        maxFiles={6}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Precios */}
          <Card>
            <CardHeader>
              <CardTitle>Precios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio (MXN)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="1500.00"
                          disabled={isPending}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimatedDurationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración estimada (días)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="60"
                          disabled={isPending}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? e.target.value : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Inventario */}
          <Card>
            <CardHeader>
              <CardTitle>Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="LAN-SK-0001"
                        disabled={isPending}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Secondary column — organización */}
        <aside className="sticky top-4 w-[300px] shrink-0 space-y-6 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Organización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Combobox
                        options={brandOptions}
                        value={field.value || undefined}
                        onChange={field.onChange}
                        placeholder="Seleccionar marca"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <FormControl>
                      <Combobox
                        options={categoryOptions}
                        value={field.value || undefined}
                        onChange={field.onChange}
                        placeholder="Seleccionar categoría"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategoría</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Sérum facial"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </aside>
      </form>
    </Form>
  );
}
