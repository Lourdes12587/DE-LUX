"use client";

import { useId, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const MAX_BYTES = 10 * 1024 * 1024;

type Pending = { key: string; name: string; error?: string };

/** Uploads one image to POST /api/admin/uploads and returns its URL. */
async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/uploads", { method: "POST", body }).catch(() => {
    throw new Error("Can't reach the server. Check that the site is running.");
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.url as string;
}

/** Drag-and-drop / file-picker for product images. Files upload one by one; each success calls onUploaded. */
export function ImageDropzone({ onUploaded, compact }: { onUploaded: (url: string, name: string) => void; compact?: boolean }) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const uploading = pending.some((p) => !p.error);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = [...list];
    const queue = files.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, name: f.name, file: f }));
    setPending((p) => [...p.filter((x) => !x.error), ...queue.map(({ key, name }) => ({ key, name }))]);

    for (const { key, name, file } of queue) {
      const fail = (error: string) => setPending((p) => p.map((x) => (x.key === key ? { ...x, error } : x)));
      if (!ACCEPT.split(",").includes(file.type)) {
        fail("Use a JPG, PNG, WebP or AVIF image");
        continue;
      }
      if (file.size > MAX_BYTES) {
        fail("Images must be 10 MB or smaller");
        continue;
      }
      try {
        onUploaded(await uploadImage(file), name);
        setPending((p) => p.filter((x) => x.key !== key));
      } catch (e) {
        fail(e instanceof Error ? e.message : "Upload failed");
      }
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed text-center transition-colors",
          compact ? "py-6" : "py-12",
          dragging ? "border-ink bg-paper" : "border-input hover:border-ink",
        )}
      >
        {uploading ? <Loader2 className="size-5 animate-spin" strokeWidth={1.25} /> : <Upload className="size-5" strokeWidth={1.25} />}
        <span className="text-[13px]">{uploading ? "Uploading…" : "Drop images here or click to upload"}</span>
        <span className="text-[11px] text-subtle">JPG, PNG, WebP or AVIF · up to 10 MB · optimised to WebP automatically</span>
      </label>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {pending.length > 0 && (
        <ul className="mt-3 space-y-1 text-[12px]" aria-live="polite">
          {pending.map((p) => (
            <li key={p.key} className={cn("flex items-center gap-2", p.error ? "text-critical" : "text-subtle")}>
              {!p.error && <Loader2 className="size-3 animate-spin" />}
              <span className="truncate">{p.name}</span>
              {p.error && <span>— {p.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
