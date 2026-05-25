import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/accept-invitation(.*)",
  "/forgot-password(.*)",
]);

const isBaRoute = createRouteMatcher(["/ba(.*)"]);

// Routes that role=ba should be redirected away from into /ba/today.
// /api/* and Next internals are excluded by the matcher config below.
const isAdminSurfaceRoute = createRouteMatcher([
  "/",
  "/dashboard(.*)",
  "/clientes(.*)",
  "/agenda(.*)",
  "/mensajes(.*)",
  "/productos(.*)",
  "/marcas(.*)",
  "/zonas(.*)",
  "/tiendas(.*)",
  "/equipo(.*)",
  "/reportes(.*)",
  "/plantillas(.*)",
  "/configuracion(.*)",
  "/auditoria(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, sessionClaims, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  const role = sessionClaims?.metadata?.role;

  // Beauty Advisors live exclusively in /ba/*. Any other surface redirects
  // them home so the admin shell never flashes for the wrong role.
  if (role === "ba" && isAdminSurfaceRoute(req) && !isBaRoute(req)) {
    return NextResponse.redirect(new URL("/ba/today", req.url));
  }

  // Non-BA roles that wander into /ba/* go back to the admin dashboard.
  if (role && role !== "ba" && isBaRoute(req)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
