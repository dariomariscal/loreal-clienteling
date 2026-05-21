import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PrivacyNotice } from "@loreal/contracts";

const privacyNoticeKeys = {
  active: (lang: string) => ["privacy-notices", "active", lang] as const,
  byVersion: (version: string, lang: string) =>
    ["privacy-notices", version, lang] as const,
};

export function useActivePrivacyNotice(lang: string = "es-MX") {
  return useQuery({
    queryKey: privacyNoticeKeys.active(lang),
    queryFn: () =>
      api.get<PrivacyNotice>("/privacy-notices/active", { lang }),
    staleTime: 5 * 60 * 1000,
  });
}
