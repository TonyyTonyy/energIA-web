import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}