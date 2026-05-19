import { cn } from "@/lib/utils"

interface EmptyStateProps {
  illustration?: React.ReactNode
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/**
 * EmptyState — shown when a list or table has no data.
 * Pass `illustration` for large SVG artwork (preferred) or `icon` for the
 * minimal round badge variant.
 */
function EmptyState({
  illustration,
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-5 px-6 py-16 text-center",
        className,
      )}
    >
      {illustration ? (
        <div className="w-full max-w-[220px] text-muted-foreground/60">
          {illustration}
        </div>
      ) : icon ? (
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <div className="max-w-sm space-y-1.5">
        <p className="font-heading text-base font-medium text-foreground">
          {title}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export { EmptyState }
