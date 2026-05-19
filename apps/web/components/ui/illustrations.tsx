/**
 * Hand-tuned monoline illustrations for empty states.
 * Use `currentColor` so they inherit text color from the parent.
 */

export function StoresIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Tiendas">
      <path d="M40 70l8-30h144l8 30" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M40 70c0 8 6 14 14 14s14-6 14-14c0 8 6 14 14 14s14-6 14-14c0 8 6 14 14 14s14-6 14-14c0 8 6 14 14 14s14-6 14-14c0 8 6 14 14 14s14-6 14-14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M48 84v60h144V84" stroke="currentColor" strokeWidth="1.5" />
      <rect x="100" y="106" width="40" height="38" stroke="currentColor" strokeWidth="1.5" />
      <path d="M40 144h160" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="68" cy="116" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="172" cy="116" r="6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function ProductsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Productos">
      <path d="M120 28l72 30v60l-72 30-72-30V58z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M48 58l72 30 72-30" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M120 88v60" stroke="currentColor" strokeWidth="1.5" />
      <path d="M84 43l72 30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  )
}

export function CustomersIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Clientes">
      <circle cx="120" cy="68" r="22" stroke="currentColor" strokeWidth="1.5" />
      <path d="M76 144c0-24 20-40 44-40s44 16 44 40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="68" cy="78" r="14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M40 132c0-16 12-26 28-26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="172" cy="78" r="14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M200 132c0-16-12-26-28-26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function BrandsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Marcas">
      <path d="M40 40h70l80 80-70 70-80-80V40z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="74" cy="74" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M120 80l40 40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M100 100l40 40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function ZonesIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Zonas">
      <path d="M30 56l60-20 60 28 60-20v90l-60 20-60-28-60 20z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M90 36v92M150 64v92" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="120" cy="92" r="10" fill="currentColor" opacity="0.15" />
      <circle cx="120" cy="92" r="4" fill="currentColor" />
    </svg>
  )
}

export function AppointmentsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Citas">
      <rect x="48" y="44" width="144" height="120" rx="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M48 76h144" stroke="currentColor" strokeWidth="1.5" />
      <path d="M82 30v28M158 30v28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="76" y="92" width="36" height="20" rx="3" fill="currentColor" opacity="0.15" />
      <rect x="124" y="120" width="48" height="20" rx="3" fill="currentColor" opacity="0.15" />
    </svg>
  )
}

export function TeamIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Equipo">
      <circle cx="120" cy="60" r="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M86 134c0-18 16-32 34-32s34 14 34 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="60" cy="80" r="12" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="180" cy="80" r="12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M36 124c0-12 10-20 24-20M204 124c0-12-10-20-24-20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
