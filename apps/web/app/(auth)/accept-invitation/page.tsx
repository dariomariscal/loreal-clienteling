import type { Metadata } from "next";
import { Suspense } from "react";
import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";

export const metadata: Metadata = {
  title: "Activar cuenta · L'Oréal Clienteling",
};

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitationForm />
    </Suspense>
  );
}
