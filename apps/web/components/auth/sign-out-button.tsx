"use client";

import { useClerk } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export function SignOutButton() {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const router = useRouter();

  async function handleSignOut() {
    // Drop every cached query so the next user doesn't briefly see data
    // scoped to the previous session before refetches land.
    queryClient.clear();
    await signOut();
    router.replace(ROUTES.SIGN_IN);
  }

  return (
    <Button variant="outline" onClick={handleSignOut}>
      Cerrar Sesión
    </Button>
  );
}
