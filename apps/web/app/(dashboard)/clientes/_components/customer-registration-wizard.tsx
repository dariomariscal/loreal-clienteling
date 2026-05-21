"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useRegisterCustomer } from "@/lib/hooks";
import { uploadFile } from "@/lib/hooks/use-uploads";
import type {
  RegistrationSearchValues,
  RegistrationBasicsValues,
  RegistrationConsentValues,
} from "@/lib/schemas/customer-registration";
import { CustomerRegistrationStepSearch } from "./customer-registration-step-search";
import { CustomerRegistrationStepBasics } from "./customer-registration-step-basics";
import { CustomerRegistrationStepConsent } from "./customer-registration-step-consent";

interface CustomerRegistrationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = "search" | "basics" | "consent";

const STEP_ORDER: WizardStep[] = ["search", "basics", "consent"];
const STEP_LABELS: Record<WizardStep, string> = {
  search: "Buscar",
  basics: "Datos",
  consent: "Consentimiento",
};

export function CustomerRegistrationWizard({
  open,
  onOpenChange,
}: CustomerRegistrationWizardProps) {
  const router = useRouter();
  const registerCustomer = useRegisterCustomer();

  const [step, setStep] = useState<WizardStep>("search");
  const [searchValues, setSearchValues] = useState<RegistrationSearchValues>({
    email: "",
    phone: "",
  });
  const [basicsValues, setBasicsValues] = useState<RegistrationBasicsValues | null>(
    null,
  );

  function resetAndClose() {
    setStep("search");
    setSearchValues({ email: "", phone: "" });
    setBasicsValues(null);
    onOpenChange(false);
  }

  function handleSearchContinue(values: RegistrationSearchValues) {
    setSearchValues(values);
    setStep("basics");
  }

  function handleBasicsContinue(values: RegistrationBasicsValues) {
    setBasicsValues(values);
    setStep("consent");
  }

  async function handleConsentSubmit(
    values: RegistrationConsentValues,
    privacyNoticeVersion: string,
  ) {
    if (!basicsValues) return;

    const signatureFile = dataUrlToFile(
      values.signatureDataUrl,
      `signature-${Date.now()}.png`,
    );
    const signatureUrl = await uploadFile(signatureFile, "signatures");

    const created = await registerCustomer.mutateAsync({
      customer: {
        firstName: basicsValues.firstName,
        lastName: basicsValues.lastName,
        email: basicsValues.email || undefined,
        phone: basicsValues.phone || undefined,
        gender: basicsValues.gender || undefined,
        birthDate: basicsValues.birthDate
          ? new Date(basicsValues.birthDate)
          : undefined,
      },
      consents: {
        privacyNoticeVersion,
        signatureUrl,
        marketingChannels: values.marketingChannels,
      },
    });

    resetAndClose();
    router.push(`/clientes/${created.id}`);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) resetAndClose();
        else onOpenChange(true);
      }}
    >
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>Registrar nueva clienta</SheetTitle>
          <StepIndicator current={step} />
        </SheetHeader>
        <SheetBody>
          {step === "search" && (
            <CustomerRegistrationStepSearch
              onContinue={handleSearchContinue}
              onCancel={resetAndClose}
            />
          )}

          {step === "basics" && (
            <CustomerRegistrationStepBasics
              defaultValues={{
                email: searchValues.email,
                phone: searchValues.phone,
                ...(basicsValues ?? {}),
              }}
              onContinue={handleBasicsContinue}
              onBack={() => setStep("search")}
            />
          )}

          {step === "consent" && (
            <CustomerRegistrationStepConsent
              onSubmit={handleConsentSubmit}
              onBack={() => setStep("basics")}
              isPending={registerCustomer.isPending}
            />
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function StepIndicator({ current }: { current: WizardStep }) {
  const currentIndex = STEP_ORDER.indexOf(current);
  return (
    <ol className="flex items-center gap-2 pt-1 text-xs">
      {STEP_ORDER.map((s, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px] font-medium",
                isActive && "border-primary bg-primary text-primary-foreground",
                isDone && "border-primary/60 bg-primary/10 text-primary",
                !isActive && !isDone && "border-input text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                isActive ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {STEP_LABELS[s]}
            </span>
            {i < STEP_ORDER.length - 1 && (
              <span className="mx-1 h-px w-6 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:([^;]+);base64/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}
