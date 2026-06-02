import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
}

/**
 * Typographic quote treatment for LLM-generated rationale text. Typeset
 * decisions on purpose:
 *
 *  - oversized opening glyph so the reader feels the voice
 *  - italic body to separate "interpretation" from system text around it
 *  - tight max-width keeps every sentence to one breath
 *
 * Use exclusively for `aiReasoning` / `rationale` fields from the engine —
 * never for static UI copy.
 */
export function RationaleQuote({ children, className }: Props) {
  return (
    <blockquote
      className={cn(
        "relative pl-5 pr-2",
        "before:absolute before:left-0 before:top-[-0.35rem] before:font-[family-name:var(--font-heading)] before:text-3xl before:leading-none before:text-[color:var(--ba-accent)] before:content-['\"']",
        className,
      )}
    >
      <p className="text-sm italic leading-snug text-foreground">{children}</p>
    </blockquote>
  );
}
