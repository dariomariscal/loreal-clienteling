"use client";

import Image from "next/image";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { TriggerPill } from "@/components/advisor/ai/trigger-pill";
import {
  useCompleteTask,
  useDismissTask,
  useTasks,
  type Task,
} from "@/lib/hooks/use-tasks";
import {
  CheckGlyph,
  CloseGlyph,
  PackageGlyph,
} from "@/components/ui/glyphs";
import type { SuggestedActionTrigger } from "@loreal/contracts";

export function TasksPage() {
  const { data, isLoading } = useTasks({ status: "pending" });
  const complete = useCompleteTask();
  const dismiss = useDismissTask();

  return (
    <SingleColumn>
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-10 py-10 lg:px-12">
        <header className="mb-10">
          <h1 className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
            Tareas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seguimientos, cumpleaños y reposiciones generados por la IA
          </p>
        </header>

        <SectionCard title="Pendientes">
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
          ) : !data || data.length === 0 ? (
            <AdvisorEmptyState
              icon={<CheckGlyph className="size-6" />}
              title="Todo al día"
              description="No tienes tareas pendientes ahora mismo."
            />
          ) : (
            <ul className="flex flex-col gap-1.5 px-2 pb-2">
              {data.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={() => complete.mutate(task.id)}
                  onDismiss={() => dismiss.mutate(task.id)}
                  completing={complete.isPending}
                  dismissing={dismiss.isPending}
                />
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </SingleColumn>
  );
}

interface TaskRowProps {
  task: Task;
  onComplete: () => void;
  onDismiss: () => void;
  completing: boolean;
  dismissing: boolean;
}

/**
 * Single task row — the layout is intentionally NOT a flat list. Three regions:
 *
 *   [pill icon] · [customer + description + due] · [product preview] · [actions]
 *
 * The product preview only mounts when the trigger is product-bound and the
 * engine resolved a SKU, so non-product triggers (birthday, win_back, …) still
 * render cleanly without a hole on the right.
 */
function TaskRow({
  task,
  onComplete,
  onDismiss,
  completing,
  dismissing,
}: TaskRowProps) {
  return (
    <li className="group/task flex items-stretch gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:bg-muted/40">
      <div className="flex shrink-0 flex-col items-center">
        <TriggerPill
          trigger={task.triggerType as SuggestedActionTrigger}
          variant="icon"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/advisor/customers/${task.customerId}`}
            className="truncate text-sm font-medium text-foreground hover:underline"
          >
            {task.customerFirstName} {task.customerLastName}
          </Link>
          {task.customerTier ? (
            <Badge
              variant="outline"
              size="sm"
              className="uppercase tracking-wider"
            >
              {task.customerTier}
            </Badge>
          ) : null}
          <TriggerPill
            trigger={task.triggerType as SuggestedActionTrigger}
            size="sm"
            className="ml-auto sm:ml-0"
          />
        </div>
        <p className="line-clamp-2 text-sm text-foreground">
          {task.description}
        </p>
        <p className="text-xs text-muted-foreground">
          {task.recommendedAction} ·{" "}
          {format(new Date(task.dueDate), "d MMM", { locale: es })}
        </p>
      </div>

      {task.product ? <ProductPreview product={task.product} /> : null}

      <div className="flex shrink-0 flex-col items-end justify-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onComplete}
          disabled={completing}
          aria-label="Marcar como hecha"
        >
          <CheckGlyph className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onDismiss}
          disabled={dismissing}
          aria-label="Descartar"
        >
          <CloseGlyph className="size-4" />
        </Button>
      </div>
    </li>
  );
}

function ProductPreview({ product }: { product: NonNullable<Task["product"]> }) {
  const image = product.images[0];
  return (
    <div className="flex shrink-0 items-center gap-2 self-stretch border-l border-border/60 pl-3">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <PackageGlyph className="size-4" />
          </div>
        )}
      </div>
      <div className="hidden min-w-0 flex-col sm:flex sm:w-32">
        {product.brandName ? (
          <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
            {product.brandName}
          </span>
        ) : null}
        <span className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
          {product.title}
        </span>
      </div>
    </div>
  );
}
