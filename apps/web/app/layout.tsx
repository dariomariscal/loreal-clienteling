import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esMX } from "@clerk/localizations";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { ApiTokenSync } from "@/components/providers/api-token-sync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(resolveSiteUrl()),
  title: {
    default: "L'Oréal Clienteling",
    template: "%s — L'Oréal Clienteling",
  },
  description: "Panel de gestión para L'Oréal Clienteling",
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "L'Oréal Clienteling",
    title: "L'Oréal Clienteling",
    description: "Panel de gestión para L'Oréal Clienteling",
  },
  twitter: {
    card: "summary_large_image",
    title: "L'Oréal Clienteling",
    description: "Panel de gestión para L'Oréal Clienteling",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider localization={esMX}>
      <html lang="es">
        <body
          className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        >
          <ApiTokenSync />
          <QueryProvider>{children}</QueryProvider>
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "rounded-xl border border-border bg-card text-foreground shadow-md",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
