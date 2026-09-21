"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type AdminSubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
};

export function AdminSubmitButton({ children, pendingLabel, variant = "default" }: AdminSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant={variant}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
