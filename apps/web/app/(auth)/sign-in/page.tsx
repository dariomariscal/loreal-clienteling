import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignInForm } from "@/components/auth/sign-in-form";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Iniciar sesión · L'Oréal Clienteling",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { userId } = await auth();
  if (userId) {
    const { redirect_url } = await searchParams;
    redirect(redirect_url ?? ROUTES.DASHBOARD);
  }

  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
