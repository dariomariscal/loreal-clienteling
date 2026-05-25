import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSession } from "@/lib/auth";
import { homeForRole } from "@/lib/auth/home-for-role";

export const metadata: Metadata = {
  title: "Iniciar sesión · L'Oréal Clienteling",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const session = await getSession();
  if (session?.user) {
    const { redirect_url } = await searchParams;
    redirect(redirect_url ?? homeForRole(session.user.role));
  }

  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
