"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateTemplate,
  COMMUNICATION_CHANNELS,
  CAMPAIGN_TYPES,
} from "@loreal/contracts";
import { createTemplateSchema } from "@/lib/schemas/templates";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import type { Brand } from "@/lib/hooks";

const CHANNEL_LABELS: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS", email: "Email" };
const CAMPAIGN_LABELS: Record<string, string> = {
  birthday: "Cumpleaños",
  replenishment: "Reposición",
  win_back: "Recuperación",
  new_launch: "Nuevo lanzamiento",
  post_purchase: "Post-compra",
  appointment_reminder: "Recordatorio de cita",
  abandoned_cart: "Carrito abandonado",
  special_event: "Evento especial",
  manual: "Manual",
  custom: "Personalizado",
};

interface TemplateFormProps {
  defaultValues?: Partial<CreateTemplate>;
  brands: Brand[];
  onSubmit: (data: CreateTemplate) => void;
  isPending: boolean;
}

export function TemplateForm({ defaultValues, brands, onSubmit, isPending }: TemplateFormProps) {
  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.displayName]));

  const form = useForm<CreateTemplate>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      brandId: defaultValues?.brandId ?? "",
      channel: defaultValues?.channel ?? COMMUNICATION_CHANNELS[0],
      campaignType: defaultValues?.campaignType ?? CAMPAIGN_TYPES[0],
      body: defaultValues?.body ?? "",
    },
  });

  function handleSubmit(data: CreateTemplate) {
    onSubmit({
      ...data,
      brandId: data.brandId || undefined,
    });
  }

  return (
    <Form {...form}>
      <form id="template-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Seguimiento 3 meses" disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="brandId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger disabled={isPending}>
                      <SelectValue placeholder="Global">
                        {field.value ? brandMap[field.value] ?? field.value : "Global (todas)"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Global (todas)</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.displayName}
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
            name="channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Canal</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={isPending}>
                      <SelectValue placeholder="Canal">
                        {field.value ? CHANNEL_LABELS[field.value] ?? field.value : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COMMUNICATION_CHANNELS.map((ch) => (
                      <SelectItem key={ch} value={ch}>
                        {CHANNEL_LABELS[ch] ?? ch}
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
            name="campaignType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de campaña</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={isPending}>
                      <SelectValue placeholder="Tipo">
                        {field.value ? CAMPAIGN_LABELS[field.value] ?? field.value : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((ft: string) => (
                      <SelectItem key={ft} value={ft}>
                        {CAMPAIGN_LABELS[ft] ?? ft}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contenido del mensaje</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={5}
                  placeholder="Hola {{customer.first_name}}, ..."
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>
                Usa {"{{customer.first_name}}"}, {"{{product.name}}"}, {"{{appointment.date}}"} como variables.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
