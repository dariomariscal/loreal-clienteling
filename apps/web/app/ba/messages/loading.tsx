export default function MessagesInboxLoading() {
  return (
    <div className="px-8 pt-8 pb-16">
      <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
        <div className="h-8 w-32 animate-pulse rounded bg-muted/40" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted/30" />
        <ul className="space-y-px">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="h-[68px] animate-pulse rounded-md bg-muted/30"
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
