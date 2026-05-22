interface SettingsPageHeaderProps {
  title: string;
  description?: string;
}

/**
 * Lightweight header for settings pages. Skips the divider that
 * `PageHeader` draws because settings pages are stacks of self-bordered
 * cards — an extra rule would compete with the card borders and feel
 * heavy (the same call Linear/Stripe make).
 */
export function SettingsPageHeader({
  title,
  description,
}: SettingsPageHeaderProps) {
  return (
    <header className="space-y-1.5">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </header>
  );
}
