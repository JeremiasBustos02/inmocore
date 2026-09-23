"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DeleteResult =
  | { ok: true; storageCleanupPending: boolean }
  | { ok: false; error: "forbidden" | "not-found" | "not-archived" | "delete-failed" };

type DeletePropertyControlProps = {
  action: () => Promise<DeleteResult>;
  propertiesHref: string;
};

export function DeletePropertyControl({ action, propertiesHref }: DeletePropertyControlProps) {
  const router = useRouter();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirmation !== "ELIMINAR" || submitLock.current) return;
    submitLock.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error === "not-archived"
          ? "Archivá la propiedad antes de eliminarla permanentemente."
          : result.error === "forbidden"
            ? "No tenés permisos para eliminar esta propiedad."
            : result.error === "not-found"
              ? "No se encontró la propiedad. Actualizá la página e intentá nuevamente."
              : "No se pudo eliminar la propiedad. Puede tener consultas asociadas.");
        setPending(false);
        submitLock.current = false;
        return;
      }

      const query = result.storageCleanupPending
        ? "?deleted=1&storageCleanup=pending"
        : "?deleted=1";
      router.replace(`${propertiesHref}${query}`);
    } catch {
      setError("No se pudo confirmar el resultado. Actualizá la página antes de volver a intentarlo.");
      setPending(false);
      submitLock.current = false;
    }
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        if (!nextOpen) {
          setConfirmation("");
          setError(null);
        }
      }}
    >
      <AlertDialog.Trigger
        render={<Button variant="destructive" type="button" />}
      >
        Eliminar propiedad permanentemente
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <AlertDialog.Popup className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <AlertDialog.Title className="text-lg font-semibold">Eliminar propiedad permanentemente</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              Esta acción es permanente. Se eliminarán la propiedad y todas sus imágenes.
            </AlertDialog.Description>
            <div className="mt-5 flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="delete-property-confirmation">
                Escribí ELIMINAR para confirmar
              </label>
              <Input
                autoComplete="off"
                id="delete-property-confirmation"
                onChange={(event) => setConfirmation(event.target.value)}
                value={confirmation}
              />
            </div>
            {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
            {pending ? <p aria-live="polite" className="mt-3 text-sm text-muted-foreground" role="status">Eliminando propiedad...</p> : null}
            <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <AlertDialog.Close
                render={<Button disabled={pending} variant="outline" type="button" />}
              >
                Cancelar
              </AlertDialog.Close>
              <Button
                disabled={confirmation !== "ELIMINAR" || pending}
                onClick={() => void handleDelete()}
                type="button"
                variant="destructive"
              >
                {pending ? "Eliminando propiedad..." : "Eliminar permanentemente"}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
