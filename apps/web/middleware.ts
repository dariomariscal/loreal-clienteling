import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { homeForRole } from "@/lib/auth/home-for-role";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/accept-invitation(.*)",
  "/forgot-password(.*)",
  // Public showroom — customer pulls this up on her phone to find the
  // product she wants the BA to scan. Must not redirect to sign-in.
  "/catalogo(.*)",
]);

const isRootRoute = createRouteMatcher(["/"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, sessionClaims, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Send each role to its own home so "/" never renders an empty shell.
  // Reading the role from sessionClaims avoids a DB roundtrip at the edge.
  if (isRootRoute(req)) {
    const role = sessionClaims?.metadata?.role;
    return NextResponse.redirect(new URL(homeForRole(role), req.url));
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
