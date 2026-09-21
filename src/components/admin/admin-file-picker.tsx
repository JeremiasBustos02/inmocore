"use client";

import type { LucideIcon } from "lucide-react";
import { FileUp } from "lucide-react";
import { useId, type ChangeEvent, type RefObject } from "react";

type AdminFilePickerProps = {
  accept: string;
  files: File[];
  hint: string;
  id?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  label: string;
  multiple?: boolean;
  onChange: (files: File[]) => void;
  disabled?: boolean;
  icon?: LucideIcon;
};

export function AdminFilePicker({
  accept,
  files,
  hint,
  id,
  inputRef,
  label,
  multiple = false,
  onChange,
  disabled = false,
  icon: Icon = FileUp,
}: AdminFilePickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(Array.from(event.target.files ?? []));
  }

  const selectedLabel = files.length === 0
    ? label
    : multiple && files.length > 1
      ? `${files.length} archivos seleccionados`
      : files[0]?.name ?? label;

  return (
    <label
      className={`group flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 py-5 text-center transition-colors hover:border-foreground/40 hover:bg-muted/50 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 ${disabled ? "pointer-events-none opacity-50" : ""}`}
      htmlFor={inputId}
    >
      <Icon aria-hidden="true" className="size-6 text-muted-foreground transition-colors group-hover:text-foreground" />
      <span className="text-sm font-medium text-foreground">{selectedLabel}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
      <input
        accept={accept}
        className="sr-only"
        disabled={disabled}
        id={inputId}
        multiple={multiple}
        onChange={handleChange}
        ref={inputRef}
        type="file"
      />
    </label>
  );
}
