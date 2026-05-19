"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PRODUCT_CATEGORIES } from "@loreal/contracts";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Dropzone } from "@/components/ui/dropzone";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ProductPreviewCard } from "./product-preview-card";
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

  const values = form.watch();
  const brandName =
    brands.find((b) => b.id === values.brandId)?.displayName ?? "";

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
        className="grid gap-8 lg:grid-cols-[1fr,320px]"
      >
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="images"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imágenes del producto</FormLabel>
                <FormControl>
                  <Dropzone
                    folder="products"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                    maxFiles={6}
                  />
                </FormControl>
                <FormDescription>
                  La primera imagen es la principal. Arrastra para reordenar.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

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
        </div>

        <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
          <p className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Vista previa
          </p>
          <ProductPreviewCard
            name={values.name || "Nombre del producto"}
            brandName={brandName}
            category={values.category}
            price={Number(values.price) || 0}
            imageUrl={values.images?.[0]}
            sku={values.sku}
          />
        </aside>
      </form>
    </Form>
  );
}
