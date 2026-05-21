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

export function TimelineIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Actividad">
      <path d="M60 28v124" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="60" cy="46" r="6" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
      <circle cx="60" cy="90" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="134" r="6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="80" y="36" width="120" height="22" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="80" y="80" width="100" height="22" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="80" y="124" width="80" height="22" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M90 47h60M90 91h44M90 135h36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

export function NotesIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Notas">
      <path d="M58 32h96l28 28v92a4 4 0 0 1-4 4H58a4 4 0 0 1-4-4V36a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M154 32v28h28" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M70 82h100M70 100h100M70 118h64" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M150 142l8 8 18-20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function BeautyIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Belleza">
      <path d="M100 30h40v22l16 18v66a4 4 0 0 1-4 4h-64a4 4 0 0 1-4-4V70l16-18V30Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M84 70h72" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="120" cy="108" r="14" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="120" cy="108" r="6" fill="currentColor" opacity="0.2" />
      <path d="M40 140l16-6M200 140l-16-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M44 96l8 4M196 96l-8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

export function PurchasesIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Compras">
      <path d="M52 60h136l-10 88a4 4 0 0 1-4 4H66a4 4 0 0 1-4-4l-10-88Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M92 60V44a28 28 0 0 1 56 0v16" stroke="currentColor" strokeWidth="1.5" />
      <path d="M88 92h64M88 110h44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

export function RecommendationsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Recomendaciones">
      <path d="M120 30l11 28 30 3-22 20 6 30-25-15-25 15 6-30-22-20 30-3 11-28Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M170 116l4 10 10 4-10 4-4 10-4-10-10-4 10-4 4-10ZM60 130l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.7" />
    </svg>
  )
}

export function MessageIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" className={className} role="img" aria-label="Mensaje">
      <path d="M40 50h160a6 6 0 0 1 6 6v68a6 6 0 0 1-6 6h-86l-30 24v-24H40a6 6 0 0 1-6-6V56a6 6 0 0 1 6-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M62 80h116M62 100h84" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}
