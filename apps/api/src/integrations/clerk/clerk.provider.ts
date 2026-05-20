import { Provider } from "@nestjs/common";
import { createClerkClient, type ClerkClient } from "@clerk/backend";

export const CLERK_CLIENT = "CLERK_CLIENT";

export const ClerkClientProvider: Provider = {
  provide: CLERK_CLIENT,
  useFactory: (): ClerkClient => {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error("CLERK_SECRET_KEY is not set");
    }
    return createClerkClient({
      secretKey,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });
  },
};

export type { ClerkClient };
