"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export interface PasswordResultPayload {
  email: string;
  password: string;
}

interface PasswordResultDialogProps {
  result: PasswordResultPayload | null;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function PasswordResultDialog({
  result,
  onClose,
  title = "Usuario creado",
  description = "Esta contraseña solo se muestra una vez. Cópiala y entrégala al usuario por un canal seguro.",
}: PasswordResultDialogProps) {
  const [copied, setCopied] = useState<"password" | "both" | null>(null);

  async function copy(text: string, kind: "password" | "both") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard may be unavailable in non-secure contexts
    }
  }

  return (
    <Dialog
      open={!!result}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRoundIcon className="h-4 w-4" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {result ? (
          <DialogBody className="space-y-4">
            <Field label="Correo" value={result.email} />
            <Field
              label="Contraseña"
              value={result.password}
              mono
              onCopy={() => copy(result.password, "password")}
              copied={copied === "password"}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                copy(
                  `Correo: ${result.email}\nContraseña: ${result.password}`,
                  "both",
                )
              }
            >
              {copied === "both" ? (
                <>
                  <CheckIcon className="mr-2 h-4 w-4" /> Copiado
                </>
              ) : (
                <>
                  <CopyIcon className="mr-2 h-4 w-4" /> Copiar correo y contraseña
                </>
              )}
            </Button>
          </DialogBody>
        ) : null}
        <DialogFooter>
          <DialogClose>
            <Button>Entendido</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FieldProps {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}

function Field({ label, value, mono, onCopy, copied }: FieldProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code
          className={`flex-1 select-all overflow-x-auto rounded-md border border-input bg-muted/40 px-3 py-2 text-sm ${
            mono ? "font-mono tracking-tight" : ""
          }`}
        >
          {value}
        </code>
        {onCopy ? (
          <Button type="button" variant="outline" size="icon" onClick={onCopy}>
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
