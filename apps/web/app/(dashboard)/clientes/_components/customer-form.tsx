"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateCustomer, GENDERS } from "@loreal/contracts";
import { z } from "zod";
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
} from "@/components/ui/form";

const GENDER_LABELS: Record<string, string> = {
  female: "Femenino",
  male: "Masculino",
  non_binary: "No binario",
  prefer_not_say: "Prefiere no decir",
};

const customerFormSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(10).max(15).optional().or(z.literal("")),
  gender: z.enum(GENDERS as [string, ...string[]]).optional().or(z.literal("")),
  birthday: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  defaultValues?: Record<string, unknown>;
  onSubmit: (data: CreateCustomer) => void;
  isPending: boolean;
}

function toBirthDateStr(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "string") return value.split("T")[0];
  return "";
}

export function CustomerForm({
  defaultValues,
  onSubmit,
  isPending,
}: CustomerFormProps) {
  const birthdayStr = toBirthDateStr(defaultValues?.birthday);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      firstName: (defaultValues?.firstName as string) ?? "",
      lastName: (defaultValues?.lastName as string) ?? "",
      email: (defaultValues?.email as string) ?? "",
      phone: (defaultValues?.phone as string) ?? "",
      gender: (defaultValues?.gender as string) ?? "",
      birthday: birthdayStr,
    },
  });

  function handleSubmit(data: CustomerFormValues) {
    const cleaned: Record<string, unknown> = {
      firstName: data.firstName,
      lastName: data.lastName,
    };
    if (data.email) cleaned.email = data.email;
    if (data.phone) cleaned.phone = data.phone;
    if (data.gender) cleaned.gender = data.gender;
    if (data.birthday) cleaned.birthday = data.birthday;
    onSubmit(cleaned as unknown as CreateCustomer);
  }

  return (
    <Form {...form}>
      <form id="customer-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="María" disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellido</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="García" disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    type="email"
                    placeholder="maria@ejemplo.com"
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="5512345678"
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
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Género</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger disabled={isPending}>
                      <SelectValue placeholder="Seleccionar">
                        {field.value ? GENDER_LABELS[field.value] ?? field.value : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {GENDER_LABELS[g] ?? g}
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
            name="birthday"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de nacimiento</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={toBirthDateStr(field.value)}
                    onChange={field.onChange}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
