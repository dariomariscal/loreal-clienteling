import type { Metadata } from "next";
import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";

export const metadata: Metadata = {
  title: "Activar cuenta · L'Oréal Clienteling",
};

export default function AcceptInvitationPage() {
  return <AcceptInvitationForm />;
}
