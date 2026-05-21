export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const ROUTES = {
  SIGN_IN: "/sign-in",
  ACCEPT_INVITATION: "/accept-invitation",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/",
} as const;
