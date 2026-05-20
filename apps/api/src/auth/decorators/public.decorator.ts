import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Skip authentication and authorization on the decorated handler/class. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
