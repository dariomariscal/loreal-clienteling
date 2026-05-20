import { Global, Module } from "@nestjs/common";
import { ClerkClientProvider, CLERK_CLIENT } from "./clerk.provider";

@Global()
@Module({
  providers: [ClerkClientProvider],
  exports: [CLERK_CLIENT],
})
export class ClerkModule {}
