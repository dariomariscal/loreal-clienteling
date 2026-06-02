import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  CreateSkillInput,
  UpdateSkillInput,
  AssignSkillToUserInput,
  AssignSkillToServiceTypeInput,
} from "@/lib/schemas/skills";

// ── Types ──────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  code: string;
  displayName: string;
  category: "brand" | "service" | "language" | "certification";
  description: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface UserSkillRow {
  id: string;
  userId: string;
  skillId: string;
  proficiency: number | null;
  expiresAt: string | null;
  code: string;
  displayName: string;
  category: Skill["category"];
}

export interface ServiceTypeSkillRow {
  id: string;
  serviceTypeId: string;
  skillId: string;
  minProficiency: number | null;
  code: string;
  displayName: string;
  category: Skill["category"];
}

export interface EligibleAdvisor {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  specialty: string | null;
}

// ── Keys ───────────────────────────────────────────────────────────

const skillKeys = {
  all: ["skills"] as const,
  detail: (id: string) => ["skills", id] as const,
  forUser: (userId: string) => ["skills", "user", userId] as const,
  forService: (serviceTypeId: string) =>
    ["skills", "service", serviceTypeId] as const,
  eligibleAdvisors: (serviceTypeId: string) =>
    ["skills", "service", serviceTypeId, "eligible-advisors"] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useSkills() {
  return useQuery({
    queryKey: skillKeys.all,
    queryFn: () => api.get<Skill[]>("/skills"),
  });
}

export function useSkill(id: string) {
  return useQuery({
    queryKey: skillKeys.detail(id),
    queryFn: () => api.get<Skill>(`/skills/${id}`),
    enabled: !!id,
  });
}

export function useUserSkills(userId: string) {
  return useQuery({
    queryKey: skillKeys.forUser(userId),
    queryFn: () => api.get<UserSkillRow[]>(`/skills/users/${userId}`),
    enabled: !!userId,
  });
}

export function useServiceTypeSkills(serviceTypeId: string) {
  return useQuery({
    queryKey: skillKeys.forService(serviceTypeId),
    queryFn: () =>
      api.get<ServiceTypeSkillRow[]>(`/skills/services/${serviceTypeId}`),
    enabled: !!serviceTypeId,
  });
}

/**
 * "Which BAs can perform this service?" — drives the BA picker on the
 * booking flow (a service that requires Lancôme + bridal only lists BAs
 * who hold both).
 */
export function useEligibleAdvisorsForService(serviceTypeId: string) {
  return useQuery({
    queryKey: skillKeys.eligibleAdvisors(serviceTypeId),
    queryFn: () =>
      api.get<EligibleAdvisor[]>(
        `/skills/services/${serviceTypeId}/eligible-advisors`,
      ),
    enabled: !!serviceTypeId,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSkillInput) => api.post<Skill>("/skills", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: skillKeys.all }),
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateSkillInput) =>
      api.patch<Skill>(`/skills/${id}`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: skillKeys.detail(updated.id) });
      qc.invalidateQueries({ queryKey: skillKeys.all });
    },
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.delete<{ id: string }>(`/skills/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: skillKeys.all }),
  });
}

export function useAssignSkillToUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignSkillToUserInput) =>
      api.post<UserSkillRow | null>("/skills/users", data),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: skillKeys.forUser(vars.userId) });
    },
  });
}

export function useRemoveSkillFromUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      skillId,
    }: {
      userId: string;
      skillId: string;
    }) => api.delete<unknown>(`/skills/users/${userId}/${skillId}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: skillKeys.forUser(vars.userId) });
    },
  });
}

export function useAssignSkillToServiceType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignSkillToServiceTypeInput) =>
      api.post<ServiceTypeSkillRow | null>("/skills/services", data),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({
        queryKey: skillKeys.forService(vars.serviceTypeId),
      });
      qc.invalidateQueries({
        queryKey: skillKeys.eligibleAdvisors(vars.serviceTypeId),
      });
    },
  });
}

export function useRemoveSkillFromServiceType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      serviceTypeId,
      skillId,
    }: {
      serviceTypeId: string;
      skillId: string;
    }) =>
      api.delete<unknown>(`/skills/services/${serviceTypeId}/${skillId}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: skillKeys.forService(vars.serviceTypeId),
      });
      qc.invalidateQueries({
        queryKey: skillKeys.eligibleAdvisors(vars.serviceTypeId),
      });
    },
  });
}
