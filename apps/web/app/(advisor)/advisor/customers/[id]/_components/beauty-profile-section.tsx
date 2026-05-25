"use client";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/advisor/section-card";
import { useBeautyProfile } from "@/lib/hooks/use-customer-detail";

interface Props {
  customerId: string;
}

export function BeautyProfileSection({ customerId }: Props) {
  const { data, isLoading } = useBeautyProfile(customerId);

  return (
    <SectionCard title="Beauty profile">
      {isLoading ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
      ) : !data ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No beauty profile yet.
        </p>
      ) : (
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 px-4 pt-2 pb-4 md:grid-cols-2">
          <Field label="Skin type" value={data.skinType} />
          <Field label="Skin tone" value={data.skinTone} />
          <Field label="Undertone" value={data.undertone} />
          <Field label="Fitzpatrick" value={data.fitzpatrickScale} />
          <ChipField label="Concerns" values={data.skinConcerns} />
          <ChipField label="Fragrance families" values={data.fragranceFamilies} />
          <ChipField label="Avoided ingredients" values={data.avoidedIngredients} />
          <ChipField label="Interests" values={data.interests} />
          {data.shades && data.shades.length > 0 ? (
            <div className="md:col-span-2">
              <dt className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
                Shade matches
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {data.shades.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground"
                  >
                    {s.swatchHex ? (
                      <span
                        className="size-3 rounded-full border border-border"
                        style={{ backgroundColor: s.swatchHex }}
                      />
                    ) : null}
                    {s.productTitle ?? s.shadeCode}
                    <span className="text-muted-foreground">{s.shadeCode}</span>
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </SectionCard>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

function ChipField({ label, values }: { label: string; values: string[] | null }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 flex flex-wrap gap-1.5">
        {values && values.length > 0 ? (
          values.map((v) => (
            <Badge key={v} variant="secondary" size="sm">
              {v}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </dd>
    </div>
  );
}
