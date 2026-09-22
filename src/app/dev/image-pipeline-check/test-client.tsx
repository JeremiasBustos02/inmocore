"use client";

import { useEffect, useState } from "react";
import { runImageOptimizationCheck } from "@/lib/image-optimization-check";

export function ImagePipelineCheck() {
  const [result, setResult] = useState<string>("Ejecutando fixture JPEG con EXIF GPS y orientación...");

  useEffect(() => {
    void runImageOptimizationCheck()
      .then((details) => setResult(`PASS\n${JSON.stringify(details, null, 2)}`))
      .catch((error: unknown) => setResult(`FAIL\n${error instanceof Error ? error.message : "Error desconocido"}`));
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">Image optimization development check</h1>
      <pre className="mt-4 whitespace-pre-wrap rounded-lg border bg-muted p-4 text-sm" id="image-pipeline-result">
        {result}
      </pre>
    </main>
  );
}
