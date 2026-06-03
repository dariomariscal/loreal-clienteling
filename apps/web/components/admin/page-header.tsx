import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/**
 * PageHeader — consistent header for every dashboard page.
 * Title on the left, optional action button on the right.
 */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div data-slot="page-header" className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {/* Subtle divider — Zen: single deliberate line */}
      <div className="h-px bg-border/60" />
    </div>
  )
}
