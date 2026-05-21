"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import {
  useCustomerSearch,
  useAppointmentEventTypes,
  type Customer,
} from "@/lib/hooks";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

const appointmentFormSchema = z.object({
  customerId: z.string().uuid("Clienta requerida"),
  eventTypeId: z.string().uuid("Tipo de evento requerido"),
  scheduledAt: z.string().min(1, "Fecha requerida"),
  durationMinutes: z.coerce.number().min(1).max(480),
  comments: z.string().max(1000).optional(),
  isVirtual: z.boolean(),
  videoLink: z.string().url().optional().or(z.literal("")),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export type AppointmentFormData = AppointmentFormValues;

interface AppointmentFormProps {
  defaultValues?: Partial<AppointmentFormValues>;
  onSubmit: (data: AppointmentFormValues) => void;
  isPending: boolean;
}

export function AppointmentForm({
  defaultValues,
  onSubmit,
  isPending,
}: AppointmentFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showResults, setShowResults] = useState(false);

  const { data: searchResults = [] } = useCustomerSearch(searchQuery);
  const { data: eventTypes = [], isLoading: eventTypesLoading } =
    useAppointmentEventTypes();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      customerId: defaultValues?.customerId ?? "",
      eventTypeId: defaultValues?.eventTypeId ?? "",
      scheduledAt: defaultValues?.scheduledAt?.slice(0, 16) ?? "",
      durationMinutes: defaultValues?.durationMinutes ?? 60,
      comments: defaultValues?.comments ?? "",
      isVirtual: defaultValues?.isVirtual ?? false,
      videoLink: defaultValues?.videoLink ?? "",
    },
  });

  // When event types load, auto-select the first one for new appointments
  useEffect(() => {
    if (!form.getValues("eventTypeId") && eventTypes.length > 0) {
      form.setValue("eventTypeId", eventTypes[0].id);
      if (!defaultValues?.durationMinutes && eventTypes[0].durationMinutes) {
        form.setValue("durationMinutes", eventTypes[0].durationMinutes);
      }
    }
  }, [eventTypes, form, defaultValues]);

  const isVirtual = form.watch("isVirtual");

  function handleSubmit(data: AppointmentFormValues) {
    onSubmit({
      ...data,
      comments: data.comments || undefined,
      videoLink: data.isVirtual ? data.videoLink || undefined : undefined,
    });
  }

  const eventTypeOptions = eventTypes.map((et) => ({
    value: et.id,
    label: et.displayName,
    description: et.durationMinutes
      ? `${et.durationMinutes} min`
      : undefined,
  }));

  return (
    <Form {...form}>
      <form
        id="appointment-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
      >
        {!defaultValues?.customerId && (
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
        )}

        <FormField
          control={form.control}
          name="eventTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de evento</FormLabel>
              <FormControl>
                <Combobox
                  options={eventTypeOptions}
                  value={field.value || undefined}
                  onChange={(value) => {
                    field.onChange(value);
                    const selected = eventTypes.find((et) => et.id === value);
                    if (selected?.durationMinutes) {
                      form.setValue("durationMinutes", selected.durationMinutes);
                    }
                  }}
                  placeholder={
                    eventTypesLoading
                      ? "Cargando..."
                      : eventTypes.length === 0
                        ? "Sin tipos configurados"
                        : "Seleccionar tipo"
                  }
                  disabled={isPending || eventTypesLoading || eventTypes.length === 0}
                />
              </FormControl>
              {eventTypes.length === 0 && !eventTypesLoading ? (
                <p className="text-xs text-muted-foreground">
                  Aún no hay tipos de cita. Configura al menos uno antes de agendar.
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="scheduledAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha y hora</FormLabel>
                <FormControl>
                  <Input {...field} type="datetime-local" disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (min)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    disabled={isPending}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comentarios</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Notas sobre la cita..."
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isVirtual"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
              </FormControl>
              <FormLabel>Cita virtual</FormLabel>
            </FormItem>
          )}
        />

        {isVirtual && (
          <FormField
            control={form.control}
            name="videoLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link de videollamada</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    type="url"
                    placeholder="https://zoom.us/j/..."
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </form>
    </Form>
  );
}
