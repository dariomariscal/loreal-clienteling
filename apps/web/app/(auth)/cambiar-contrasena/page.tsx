import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata: Metadata = {
  title: "Cambiar contraseña · L'Oréal Clienteling",
};

export default function ChangePasswordPage() {
  return <ChangePasswordForm />;
}
