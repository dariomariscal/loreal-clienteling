export default function ScheduleLoading() {
  return (
    <div className="px-8 pt-8 pb-16">
      <div className="mx-auto max-w-2xl space-y-6" aria-busy="true">
        <div className="h-6 w-24 animate-pulse rounded bg-muted/40" />
        <ul className="space-y-px">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="h-[72px] animate-pulse rounded-md bg-muted/30"
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
