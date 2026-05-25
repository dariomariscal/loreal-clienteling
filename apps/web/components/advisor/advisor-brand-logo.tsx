import {
  LancomeLogo,
  LorealLogo,
  YslLogo,
} from "@/components/ui/brand-logos";

interface Props {
  role: string;
  brandCode?: string | null;
  /** Pixel width of the rendered logo. Height auto-derives from aspect ratio. */
  width?: number;
  className?: string;
}

/**
 * Picks the right brand mark for the BA shell header.
 * Mirrors the desktop dashboard's logo resolution so a Lancôme BA and a
 * Lancôme manager see the same identity.
 */
export function AdvisorBrandLogo({
  role,
  brandCode,
  width = 120,
  className,
}: Props) {
  if (role === "admin" && !brandCode) {
    return <LorealLogo width={width} className={className} />;
  }

  const code = brandCode?.toUpperCase();
  if (code === "YSL") return <YslLogo width={width} className={className} />;
  if (code === "LANCOME")
    return <LancomeLogo width={width} className={className} />;

  return <LancomeLogo width={width} className={className} />;
}
