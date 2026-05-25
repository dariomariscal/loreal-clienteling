"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BackGlyph,
  UploadCloudGlyph,
  CheckCircleGlyph,
  AlertCircleGlyph,
  DownloadGlyph,
  SpinnerGlyph,
} from "@/components/ui/glyphs";

import { useBrands, useBulkCreateProducts } from "@/lib/hooks";
import {
  BULK_PRODUCT_LIMIT,
  PRODUCT_CATEGORIES,
  type BulkImportResult,
  type CreateProduct,
} from "@loreal/contracts";
import { parseCsv, toCsv, downloadFile } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TEMPLATE_HEADERS = [
  "sku",
  "name",
  "brandCode",
  "category",
  "subcategory",
  "description",
  "price",
  "estimatedDurationDays",
] as const;

type TemplateField = (typeof TEMPLATE_HEADERS)[number];

interface RowPreview {
  index: number;
  raw: Record<string, string>;
  product: CreateProduct | null;
  errors: string[];
}

type Stage = "upload" | "preview" | "result";

export function ProductsImport() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: brands = [] } = useBrands();
  const bulkCreate = useBulkCreateProducts();

  const [stage, setStage] = useState<Stage>("upload");
  const [filename, setFilename] = useState<string>("");
  const [preview, setPreview] = useState<RowPreview[]>([]);
  const [mode, setMode] = useState<"atomic" | "best_effort">("atomic");
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const brandByCode = new Map(brands.map((b) => [b.code.toUpperCase(), b]));
  const validRows = preview.filter((r) => r.errors.length === 0);
  const invalidRows = preview.filter((r) => r.errors.length > 0);

  function handleDownloadTemplate() {
    const sampleBrand = brands[0]?.code ?? "LANCOME";
    const csv = toCsv(TEMPLATE_HEADERS as unknown as string[], [
      [
        "LAN-SK-0001",
        "Advanced Génifique Sérum",
        sampleBrand,
        "skincare",
        "serum",
        "Sérum activador de juventud",
        "1899.00",
        "60",
      ],
      [
        "LAN-MK-0102",
        "Teint Idole Ultra Wear Foundation",
        sampleBrand,
        "makeup",
        "foundation",
        "Base de larga duración",
        "950.00",
        "",
      ],
    ]);
    downloadFile("productos-plantilla.csv", csv);
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const { headers, rows } = parseCsv(text);

    if (rows.length === 0) {
      alert("El archivo no contiene filas de datos.");
      return;
    }
    if (rows.length > BULK_PRODUCT_LIMIT) {
      alert(`Máximo ${BULK_PRODUCT_LIMIT} filas por importación.`);
      return;
    }

    const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
    const headerIndex: Record<TemplateField, number> = Object.fromEntries(
      TEMPLATE_HEADERS.map((field) => [
        field,
        normalizedHeaders.indexOf(field.toLowerCase()),
      ]),
    ) as Record<TemplateField, number>;

    const previewRows: RowPreview[] = rows.map((row, i) => {
      const raw: Record<string, string> = {};
      for (const field of TEMPLATE_HEADERS) {
        const idx = headerIndex[field];
        raw[field] = idx >= 0 ? (row[idx] ?? "").trim() : "";
      }
      const errors = validateRow(raw, brandByCode);
      const product = errors.length === 0 ? rowToProduct(raw, brandByCode) : null;
      return { index: i, raw, product, errors };
    });

    setFilename(file.name);
    setPreview(previewRows);
    setStage("preview");
  }

  async function handleConfirm() {
    if (validRows.length === 0) return;
    const payload = {
      products: validRows.map((r) => r.product!),
      mode,
    };
    const res = await bulkCreate.mutateAsync(payload);
    setResult(res);
    setStage("result");
  }

  function handleReset() {
    setStage("upload");
    setPreview([]);
    setResult(null);
    setFilename("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/productos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <BackGlyph className="size-4" />
        Volver a productos
      </Link>

      <PageHeader
        title="Importar productos desde CSV"
        description={`Hasta ${BULK_PRODUCT_LIMIT} productos por archivo. Valida antes de confirmar.`}
        action={
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <DownloadGlyph className="mr-1.5 size-4" />
            Descargar plantilla
          </Button>
        }
      />

      <Stepper stage={stage} />

      {stage === "upload" && (
        <UploadCard
          fileInputRef={fileInputRef}
          onFile={handleFile}
        />
      )}

      {stage === "preview" && (
        <PreviewStage
          filename={filename}
          preview={preview}
          validCount={validRows.length}
          invalidCount={invalidRows.length}
          mode={mode}
          onModeChange={setMode}
          onCancel={handleReset}
          onConfirm={handleConfirm}
          isPending={bulkCreate.isPending}
        />
      )}

      {stage === "result" && result && (
        <ResultStage
          result={result}
          preview={preview}
          onImportAnother={handleReset}
          onGoToProducts={() => router.push("/productos")}
        />
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function validateRow(
  raw: Record<string, string>,
  brandByCode: Map<string, { id: string }>,
): string[] {
  const errors: string[] = [];
  if (!raw.sku) errors.push("SKU requerido");
  else if (raw.sku.length > 50) errors.push("SKU máx. 50 caracteres");

  if (!raw.name) errors.push("Nombre requerido");
  else if (raw.name.length > 200) errors.push("Nombre máx. 200 caracteres");

  if (!raw.brandCode) errors.push("brandCode requerido");
  else if (!brandByCode.has(raw.brandCode.toUpperCase())) {
    errors.push(`Marca "${raw.brandCode}" no existe`);
  }

  if (!raw.category) errors.push("Categoría requerida");
  else if (!(PRODUCT_CATEGORIES as readonly string[]).includes(raw.category)) {
    errors.push(
      `Categoría inválida (esperado: ${PRODUCT_CATEGORIES.join(" | ")})`,
    );
  }

  const price = Number(raw.price);
  if (!raw.price) errors.push("Precio requerido");
  else if (Number.isNaN(price) || price <= 0)
    errors.push("Precio debe ser número positivo");

  if (raw.estimatedDurationDays) {
    const days = Number(raw.estimatedDurationDays);
    if (!Number.isInteger(days) || days <= 0) {
      errors.push("Duración debe ser entero positivo");
    }
  }

  return errors;
}

function rowToProduct(
  raw: Record<string, string>,
  brandByCode: Map<string, { id: string }>,
): CreateProduct {
  const brand = brandByCode.get(raw.brandCode.toUpperCase())!;
  return {
    sku: raw.sku,
    title: raw.name,
    brandId: brand.id,
    category: raw.category,
    subcategory: raw.subcategory || undefined,
    description: raw.description || undefined,
    price: Number(raw.price),
    replenishmentDays: raw.estimatedDurationDays
      ? Number(raw.estimatedDurationDays)
      : undefined,
  };
}

// ── Stage 1: Upload ────────────────────────────────────────────────

function UploadCard({
  fileInputRef,
  onFile,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-input bg-muted/20 px-6 py-16 text-center transition-colors",
        isDragging && "border-accent bg-accent/5",
      )}
    >
      <UploadCloudGlyph className="size-10 text-muted-foreground/50" />
      <div className="space-y-1">
        <p className="text-base font-medium">
          Arrastra tu archivo CSV o{" "}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-accent underline underline-offset-2"
          >
            elige uno
          </button>
        </p>
        <p className="text-sm text-muted-foreground">
          Usa la plantilla para asegurar que las columnas estén correctas.
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </div>
  );
}

// ── Stage 2: Preview ───────────────────────────────────────────────

function PreviewStage({
  filename,
  preview,
  validCount,
  invalidCount,
  mode,
  onModeChange,
  onCancel,
  onConfirm,
  isPending,
}: {
  filename: string;
  preview: RowPreview[];
  validCount: number;
  invalidCount: number;
  mode: "atomic" | "best_effort";
  onModeChange: (mode: "atomic" | "best_effort") => void;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
        <span className="font-mono text-sm">{filename}</span>
        <span className="text-sm text-muted-foreground">
          {preview.length} fila{preview.length !== 1 ? "s" : ""}
        </span>
        <Badge variant="success" size="sm">
          {validCount} válidas
        </Badge>
        {invalidCount > 0 && (
          <Badge variant="destructive" size="sm">
            {invalidCount} con errores
          </Badge>
        )}
      </div>

      <fieldset className="space-y-2 rounded-xl border border-border/60 bg-card px-4 py-3">
        <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Modo de importación
        </legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/40">
          <input
            type="radio"
            name="mode"
            value="atomic"
            checked={mode === "atomic"}
            onChange={() => onModeChange("atomic")}
            className="mt-1"
          />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Todo o nada (recomendado)</p>
            <p className="text-xs text-muted-foreground">
              Si alguna fila falla, no se inserta nada. Útil para mantener el
              catálogo consistente.
            </p>
          </div>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/40">
          <input
            type="radio"
            name="mode"
            value="best_effort"
            checked={mode === "best_effort"}
            onChange={() => onModeChange("best_effort")}
            className="mt-1"
          />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Insertar las válidas</p>
            <p className="text-xs text-muted-foreground">
              Las filas con errores se omiten y verás un reporte al final.
            </p>
          </div>
        </label>
      </fieldset>

      <PreviewTable preview={preview} />

      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Subir otro archivo
        </Button>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {validCount > 0
              ? `Se importarán ${validCount} producto${validCount !== 1 ? "s" : ""}`
              : "Corrige los errores y vuelve a subir el archivo"}
          </p>
          <Button
            disabled={validCount === 0 || isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <SpinnerGlyph className="mr-1.5 size-4 animate-spin" />
                Importando...
              </>
            ) : (
              `Importar ${validCount} producto${validCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewTable({ preview }: { preview: RowPreview[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="w-12 px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">SKU</th>
              <th className="px-3 py-2 text-left font-medium">Nombre</th>
              <th className="px-3 py-2 text-left font-medium">Marca</th>
              <th className="px-3 py-2 text-left font-medium">Categoría</th>
              <th className="px-3 py-2 text-right font-medium">Precio</th>
              <th className="px-3 py-2 text-left font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row) => (
              <tr
                key={row.index}
                className={cn(
                  "border-t border-border/40",
                  row.errors.length > 0 && "bg-destructive/5",
                )}
              >
                <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                  {row.index + 1}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.raw.sku || "—"}
                </td>
                <td className="px-3 py-2">{row.raw.name || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.raw.brandCode || "—"}
                </td>
                <td className="px-3 py-2">{row.raw.category || "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.raw.price || "—"}
                </td>
                <td className="px-3 py-2">
                  {row.errors.length === 0 ? (
                    <Badge variant="success" size="sm">
                      OK
                    </Badge>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {row.errors.map((err, i) => (
                        <span
                          key={i}
                          className="text-xs text-destructive"
                        >
                          {err}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Stage 3: Result ────────────────────────────────────────────────

function ResultStage({
  result,
  preview,
  onImportAnother,
  onGoToProducts,
}: {
  result: BulkImportResult;
  preview: RowPreview[];
  onImportAnother: () => void;
  onGoToProducts: () => void;
}) {
  const hasFailures = result.failed > 0;
  const allSucceeded = result.inserted > 0 && !hasFailures;

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border p-4",
          allSucceeded
            ? "border-success/30 bg-success/5"
            : hasFailures && result.inserted === 0
              ? "border-destructive/30 bg-destructive/5"
              : "border-warning/30 bg-warning/5",
        )}
      >
        {allSucceeded ? (
          <CheckCircleGlyph className="mt-0.5 size-5 text-success" />
        ) : (
          <AlertCircleGlyph className="mt-0.5 size-5 text-warning" />
        )}
        <div className="space-y-1">
          <p className="font-medium">
            {allSucceeded
              ? `${result.inserted} producto${result.inserted !== 1 ? "s" : ""} importado${result.inserted !== 1 ? "s" : ""}`
              : result.inserted === 0
                ? "No se importó ningún producto"
                : `${result.inserted} importado${result.inserted !== 1 ? "s" : ""}, ${result.failed} con errores`}
          </p>
          {hasFailures && (
            <p className="text-sm text-muted-foreground">
              Revisa los errores debajo. Puedes corregir el archivo y volver a
              intentar.
            </p>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="w-12 px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">SKU</th>
                <th className="px-3 py-2 text-left font-medium">Nombre</th>
                <th className="px-3 py-2 text-left font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => {
                const previewRow = preview[row.index];
                return (
                  <tr
                    key={row.index}
                    className={cn(
                      "border-t border-border/40",
                      row.status === "failed" && "bg-destructive/5",
                      row.status === "skipped" && "bg-muted/30",
                    )}
                  >
                    <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                      {row.index + 1}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.sku}</td>
                    <td className="px-3 py-2">
                      {previewRow?.raw.name ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.status === "inserted" && (
                        <Badge variant="success" size="sm">
                          Insertado
                        </Badge>
                      )}
                      {row.status === "skipped" && (
                        <Badge variant="secondary" size="sm">
                          Omitido
                        </Badge>
                      )}
                      {row.status === "failed" && (
                        <span className="text-xs text-destructive">
                          {row.error ?? "Error"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
        <Button variant="outline" onClick={onImportAnother}>
          Importar otro archivo
        </Button>
        <Button onClick={onGoToProducts}>Ir a productos</Button>
      </div>
    </div>
  );
}

// ── Progress stepper ───────────────────────────────────────────────

function Stepper({ stage }: { stage: Stage }) {
  const steps = [
    { id: "upload", label: "Subir archivo" },
    { id: "preview", label: "Revisar y mapear" },
    { id: "result", label: "Confirmar" },
  ];
  const currentIndex = steps.findIndex((s) => s.id === stage);

  return (
    <ol className="flex items-center gap-2 text-sm">
      {steps.map((step, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[11px] font-medium",
                isDone
                  ? "bg-success text-success-foreground"
                  : isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {isDone ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "transition-colors",
                isActive
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span className="mx-1 h-px w-8 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
