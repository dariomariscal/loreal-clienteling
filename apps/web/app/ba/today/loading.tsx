export default function Loading() {
  return (
    <div className="px-8 pt-8 pb-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="h-12 w-72 animate-pulse rounded-md bg-muted/60" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    </div>
  );
}
