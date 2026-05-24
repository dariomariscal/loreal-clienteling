export default function Loading() {
  return (
    <div className="px-8 pt-8 pb-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="size-16 animate-pulse rounded-full bg-muted/60" />
          <div className="space-y-2">
            <div className="h-7 w-56 animate-pulse rounded-md bg-muted/60" />
            <div className="h-4 w-32 animate-pulse rounded-md bg-muted/40" />
          </div>
        </div>
        <div className="h-24 animate-pulse rounded-lg bg-muted/40" />
        <div className="h-28 animate-pulse rounded-xl bg-muted/40" />
      </div>
    </div>
  );
}
