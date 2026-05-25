import { Avatar } from "@/components/ui/avatar";

interface CustomerAvatarProps {
  firstName: string;
  lastName?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  sm: "sm",
  md: "default",
  lg: "lg",
  xl: "xl",
} as const;

export function CustomerAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = "md",
  className,
}: CustomerAvatarProps) {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim() || "?";
  return (
    <Avatar
      name={name}
      src={avatarUrl ?? undefined}
      size={SIZE_MAP[size]}
      className={className}
    />
  );
}
