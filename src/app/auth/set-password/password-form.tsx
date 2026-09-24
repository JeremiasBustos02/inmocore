"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInvitationPassword } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(createInvitationPassword, { error: "" });

  return (
    <form action={action} className="mt-6 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="new-password">Nueva contraseña</label>
        <Input autoComplete="new-password" id="new-password" minLength={8} name="password" required type="password" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="confirm-password">Repetir contraseña</label>
        <Input autoComplete="new-password" id="confirm-password" minLength={8} name="confirmation" required type="password" />
      </div>
      {state.error ? <p className="text-sm text-destructive" role="alert">{state.error}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Creando contraseña..." : "Crear contraseña y continuar"}
      </Button>
    </form>
  );
}
