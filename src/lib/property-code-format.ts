export function formatPropertyCode(prefix: string, sequence: number) {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

export function derivePropertyCodePrefix(slug: string) {
  const normalized = slug.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return (normalized || "PROP").slice(0, 5).padEnd(3, "X");
}
