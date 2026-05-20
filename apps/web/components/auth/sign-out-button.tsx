"use client";

import { SignOutButton as ClerkSignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <ClerkSignOutButton redirectUrl="/sign-in">
      <Button variant="outline">Cerrar Sesión</Button>
    </ClerkSignOutButton>
  );
}
