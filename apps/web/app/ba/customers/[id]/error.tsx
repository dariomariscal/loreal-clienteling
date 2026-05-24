"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center px-8 py-12">
      <div className="max-w-sm text-center">
        <p className="text-[15px] text-foreground">
          No pude cargar la ficha de esta clienta.
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          A veces es una conexión intermitente. Vuelve a intentarlo.
        </p>
        <Button onClick={reset} variant="outline" className="mt-4">
          Reintentar
        </Button>
      </div>
    </div>
  );
}
