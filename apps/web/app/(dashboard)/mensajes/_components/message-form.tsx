"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateMessage,
  COMMUNICATION_CHANNELS,
  CAMPAIGN_TYPES,
} from "@loreal/contracts";
import { createMessageSchema } from "@/lib/schemas/messages";
import { useCustomerSearch, useTemplates, type Customer } from "@/lib/hooks";
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
  FormMessage,
} from "@/components/ui/form";

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

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

export type MessageFormData = CreateMessage;

interface MessageFormProps {
  onSubmit: (data: CreateMessage) => void;
  isPending: boolean;
}

export function MessageForm({
  onSubmit,
  isPending,
}: MessageFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showResults, setShowResults] = useState(false);

  const { data: searchResults = [] } = useCustomerSearch(searchQuery);
  const { data: templates = [] } = useTemplates();

  const form = useForm<CreateMessage>({
    resolver: zodResolver(createMessageSchema),
    defaultValues: {
      customerId: "",
      channel: COMMUNICATION_CHANNELS[0],
      campaignType: CAMPAIGN_TYPES[0],
      subject: "",
      body: "",
    },
  });

  function handleTemplateChange(templateId: string | null) {
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) form.setValue("body", tpl.body);
  }

  function handleSubmit(data: CreateMessage) {
    onSubmit({
      ...data,
      subject: data.subject || undefined,
    });
  }

  return (
    <Form {...form}>
      <form id="message-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="relative space-y-2">
          <FormField
            control={form.control}
            name="customerId"
            render={() => (
              <FormItem>
                <FormLabel>Clienta</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Buscar clienta..."
                    value={
                      selectedCustomer
                        ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                        : searchQuery
                    }
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedCustomer(null);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {showResults && searchResults.length > 0 && !selectedCustomer && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-xl border border-border/50 bg-card shadow-lg ring-1 ring-foreground/6">
              {searchResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted/40"
                  onClick={() => {
                    setSelectedCustomer(c);
                    setShowResults(false);
                    setSearchQuery("");
                    form.setValue("customerId", c.id);
                  }}
                >
                  {c.firstName} {c.lastName}
                  {c.email && (
                    <span className="ml-2 text-muted-foreground">{c.email}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Canal</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={isPending}>
                      <SelectValue placeholder="Seleccionar canal">
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
                <FormLabel>Campaña</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={isPending}>
                      <SelectValue placeholder="Seleccionar tipo">
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

        {templates.length > 0 && (
          <FormItem>
            <FormLabel>Plantilla (opcional)</FormLabel>
            <Select onValueChange={handleTemplateChange}>
              <FormControl>
                <SelectTrigger disabled={isPending}>
                  <SelectValue placeholder="Seleccionar plantilla" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asunto (solo email)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="Asunto del mensaje..." disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensaje</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Escribe el mensaje..."
                  disabled={isPending}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
