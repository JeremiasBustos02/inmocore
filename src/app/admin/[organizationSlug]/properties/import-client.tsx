"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmPropertyImport, previewPropertyImport, type ImportActionResult, type ImportPreview, type ImportResult } from "./import-actions";

export function PropertyImportClient({ organizationSlug }: { organizationSlug: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submitPreview() {
    if (!file) {
      setMessage("Seleccioná un archivo .xlsx.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    setMessage("");
    setResult(null);
    startTransition(async () => {
      const response = await previewPropertyImport(organizationSlug, formData);
      if (response.ok && !("result" in response)) setPreview(response);
      else setMessage(response.ok ? "No se pudo generar el preview." : response.message);
    });
  }

  function submitImport() {
    if (!file || !preview || preview.validRows === 0) return;
    const formData = new FormData();
    formData.set("file", file);
    setMessage("");
    startTransition(async () => {
      const response: ImportActionResult = await confirmPropertyImport(organizationSlug, formData);
      if (response.ok && "result" in response) {
        setResult(response);
        setPreview(null);
      } else setMessage(response.ok ? "No se pudo importar el archivo." : response.message);
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-3">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href={`/admin/${encodeURIComponent(organizationSlug)}/properties`}>Volver a propiedades</Link>
        <h1 className="text-3xl font-semibold tracking-tight">Importar propiedades</h1>
        <p className="max-w-3xl text-muted-foreground">Seleccioná un .xlsx para validar sus filas y revisar el preview. No se crea ninguna propiedad hasta confirmar.</p>
      </header>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="excel-file">
          Archivo Excel (.xlsx)
          <Input id="excel-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setResult(null); }} />
        </label>
        <p className="text-sm text-muted-foreground">Máximo 5 MB y 1.000 filas. Se lee únicamente la primera hoja.</p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={submitPreview} disabled={isPending || !file}>{isPending ? "Validando..." : "Validar y previsualizar"}</Button>
          <Link className={buttonVariants({ variant: "outline" })} href={`/admin/${encodeURIComponent(organizationSlug)}/properties`}>Cancelar</Link>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Columnas soportadas</h2>
        <p className="mt-2 text-sm text-muted-foreground">Obligatorias: Referencia, Título, Operación, Tipo, Ciudad y Provincia. Opcionales: Estado, Precio, Moneda, Publicada, Destacada, Dirección, País, Descripción, Dormitorios, Baños, Ambientes, Cocheras, Superficie cubierta y Superficie total.</p>
        <p className="mt-2 text-sm text-muted-foreground">Se aceptan valores humanos en español, como Venta, Departamento, Disponible, Borrador, Sí y No. Si no se informa País, Estado o Publicada, se usan Argentina, Borrador y No.</p>
      </section>

      {message ? <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" role="alert">{message}</p> : null}
      {result ? <p className="rounded-lg border bg-muted p-4 text-sm" role="status">Importación finalizada: {result.totalRows} filas, {result.importedRows} importadas, {result.omittedRows} omitidas, {result.errorRows} con errores y {result.duplicateRows} duplicadas.</p> : null}

      {preview ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-semibold">Preview</h2><p className="text-sm text-muted-foreground">{preview.totalRows} filas · {preview.validRows} válidas · {preview.invalidRows} con errores · {preview.duplicateRows} duplicadas</p></div>
            <Button type="button" onClick={submitImport} disabled={isPending || preview.validRows === 0}>{isPending ? "Importando..." : `Importar ${preview.validRows} filas válidas`}</Button>
          </div>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Fila</TableHead><TableHead>Referencia</TableHead><TableHead>Título</TableHead><TableHead>Resultado</TableHead></TableRow></TableHeader>
              <TableBody>{preview.rows.map((row) => <TableRow key={row.row}><TableCell>{row.row}</TableCell><TableCell>{row.reference || "-"}</TableCell><TableCell>{row.title || "-"}</TableCell><TableCell>{row.errors.length ? <div className="flex flex-col gap-1">{row.errors.map((error) => <Badge key={error} variant="destructive">{error}</Badge>)}</div> : <Badge>Válida</Badge>}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
