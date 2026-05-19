"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type CreateBrand, BRAND_TIERS } from "@loreal/contracts";
import { createBrandSchema } from "@/lib/schemas/brands";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Dropzone } from "@/components/ui/dropzone";
import { ColorPicker } from "@/components/ui/color-picker";

const TIER_LABELS: Record<string, string> = {
  luxury: "Lujo",
  premium: "Premium",
  mass: "Masivo",
};

const brandFormSchema = createBrandSchema.extend({
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
});

export type BrandFormValues = z.infer<typeof brandFormSchema>;

interface BrandFormProps {
  defaultValues?: Partial<BrandFormValues>;
  onSubmit: (data: BrandFormValues) => void;
  isPending: boolean;
}

export function BrandForm({ defaultValues, onSubmit, isPending }: BrandFormProps) {
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      code: defaultValues?.code ?? "",
      displayName: defaultValues?.displayName ?? "",
      tier: defaultValues?.tier ?? BRAND_TIERS[0],
      logoUrl: defaultValues?.logoUrl ?? "",
      primaryColor: defaultValues?.primaryColor ?? "",
      accentColor: defaultValues?.accentColor ?? "",
    },
  });

  const values = form.watch();

  return (
    <Form {...form}>
      <form
        id="brand-form"
        onSubmit={form.handleSubmit((data) =>
          onSubmit({
            ...data,
            logoUrl: data.logoUrl || undefined,
            primaryColor: data.primaryColor || undefined,
            accentColor: data.accentColor || undefined,
          }),
        )}
        className="grid gap-6 lg:grid-cols-[1fr,260px]"
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="LANCOME" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Lancôme" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="tier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Segmento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={isPending}>
                      <SelectValue placeholder="Seleccionar segmento">
                        {field.value ? TIER_LABELS[field.value] ?? field.value : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BRAND_TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {TIER_LABELS[tier] ?? tier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logotipo</FormLabel>
                <FormControl>
                  <Dropzone
                    folder="logos"
                    single
                    value={field.value ? [field.value] : []}
                    onChange={(urls) => field.onChange(urls[0] ?? "")}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>SVG o PNG con fondo transparente</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="primaryColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color primario</FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accentColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color de acento</FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <BrandPreviewPane
          name={values.displayName || "Marca"}
          tier={values.tier}
          logoUrl={values.logoUrl}
          primaryColor={values.primaryColor || "#1a1a1a"}
          accentColor={values.accentColor || "#c8a04d"}
        />
      </form>
    </Form>
  );
}

interface BrandPreviewPaneProps {
  name: string;
  tier?: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
}

function BrandPreviewPane({
  name,
  tier,
  logoUrl,
  primaryColor,
  accentColor,
}: BrandPreviewPaneProps) {
  return (
    <aside className="space-y-3">
      <p className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        Vista previa
      </p>
      <div
        className="overflow-hidden rounded-xl border border-border/60"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex h-32 items-center justify-center p-6">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          ) : (
            <span
              className="font-heading text-xl font-medium tracking-wider"
              style={{ color: accentColor }}
            >
              {name.toUpperCase()}
            </span>
          )}
        </div>
        <div className="space-y-1.5 bg-background px-4 py-3">
          <p className="font-heading text-sm font-medium">{name}</p>
          {tier && (
            <span
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
              style={{
                backgroundColor: `${accentColor}20`,
                color: accentColor,
              }}
            >
              {TIER_LABELS[tier] ?? tier}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Así verán los Beauty Advisors el branding en la app móvil.
      </p>
    </aside>
  );
}
