import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";

import { usersApi } from "./api";

export const userKeys = {
  all: ["users"] as const,
  me: () => [...userKeys.all, "me"] as const,
};

export function useMe() {
  const { isSignedIn, isLoaded } = useAuth();
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: () => usersApi.me(),
    enabled: isLoaded && !!isSignedIn,
  });
}
