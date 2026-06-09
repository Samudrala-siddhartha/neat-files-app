import { useEffect, useState } from "react";
import { Download, X, ScanText, Loader2, FileText, Image as ImgIcon, FileQuestion } from "lucide-react";
import type { StoredFile } from "@/lib/storage/db";
import { formatBytes } from "@/lib/store";

const TEXT_EXTS = new Set([
  "txt","md","markdown","log","csv","tsv","json","jsonl","xml","yaml","yml","toml","ini","cfg","conf","env",
  "html","htm","css","scss","less","js","jsx","ts","tsx","mjs","cjs","py","rb","go","rs","java","c","h",
  "cpp","hpp","cs","php","sh","bash","zsh","fish","sql","graphql","gql","svg","vue","svelte","astro",
]);
const IMAGE_EXTS = new Set(["png","jpg","jpeg","gif","webp","bmp","svg","avif","ico"]);
const AUDIO_EXTS = new Set(["mp3","wav","ogg","m4a","flac","aac","opus"]);
const VIDEO_EXTS = new Set(["mp4","webm","mov","mkv","avi","m4v"]);
const PDF_EXTS = new Set(["pdf"]);

export function kindOf(ext: string): "text" | "image" | "audio" | "video" | "pdf" | "binary" {
  if (TEXT_EXTS.has(ext)) return "text";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (PDF_EXTS.has(ext)) return "pdf";
  return "binary";
}

export function FilePreview({ file, onClose }: { file: StoredFile; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const kind = kindOf(file.extension);

  useEffect(() => {
    const u = URL.createObjectURL(file.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    let abort = false;
    setText(null); setPdfText(null); setOcrText(null); setErr(null);
    (async () => {
      try {
        if (kind === "text") {
          const t = await file.blob.text();
          if (!abort) setText(t.slice(0, 200_000));
        } else if (kind === "pdf") {
          setBusy("Parsing PDF…");
          const text = await parsePdf(file.blob);
          if (!abort) setPdfText(text);
        }
      } catch (e) {
        if (!abort) setErr(String(e));
      } finally {
        if (!abort) setBusy(null);
      }
    })();
    return () => { abort = true; };
  }, [file, kind]);

  const runOCR = async () => {
    if (kind !== "image" || !url) return;
    setBusy("Running OCR (loading engine on first run)…");
    setOcrText(null);
    setErr(null);
    try {
      const { default: Tesseract } = await import("tesseract.js");
      const { data } = await Tesseract.recognize(url, "eng", {
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status) setBusy(`${m.status} ${Math.round((m.progress ?? 0) * 100)}%`);
        },
      });
      setOcrText(data.text.trim() || "(no text detected)");
    } catch (e) {
      setErr("OCR failed: " + String(e));
    } finally {
      setBusy(null);
    }
  };

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = file.name; a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-6" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-5xl max-h-full overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <FileIcon kind={kind} />
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{file.name}</div>
            <div className="text-xs text-muted-foreground">
              {file.extension.toUpperCase()} · {formatBytes(file.size)} · {new Date(file.importedAt).toLocaleString()}
            </div>
          </div>
          {kind === "image" && (
            <button onClick={runOCR} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50">
              <ScanText className="size-3.5" /> OCR
            </button>
          )}
          <button onClick={download} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
            <Download className="size-3.5" /> Download
          </button>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent" aria-label="Close">
            <X className="size-4" />
          </button>
        </header>

        <div className="overflow-auto p-4 flex-1 min-h-0">
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Loader2 className="size-4 animate-spin" /> {busy}
            </div>
          )}
          {err && <div className="text-sm text-destructive mb-3">{err}</div>}

          {kind === "image" && url && (
            <div className="space-y-3">
              <img src={url} alt={file.name} className="max-w-full max-h-[60vh] mx-auto rounded border border-border" />
              {ocrText && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">OCR text</h3>
                  <pre className="whitespace-pre-wrap text-xs bg-muted/40 rounded p-3 max-h-64 overflow-auto">{ocrText}</pre>
                </section>
              )}
            </div>
          )}

          {kind === "video" && url && (
            <video src={url} controls className="w-full max-h-[70vh] rounded border border-border" />
          )}
          {kind === "audio" && url && (
            <audio src={url} controls className="w-full" />
          )}

          {kind === "text" && text !== null && (
            <pre className="whitespace-pre-wrap text-xs bg-muted/40 rounded p-3 max-h-[70vh] overflow-auto font-mono">{text || "(empty file)"}</pre>
          )}

          {kind === "pdf" && (
            <div className="space-y-3">
              {url && (
                <object data={url} type="application/pdf" className="w-full h-[60vh] rounded border border-border">
                  <p className="text-sm text-muted-foreground p-4">Your browser can't embed this PDF. Use Download.</p>
                </object>
              )}
              {pdfText && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Extracted text</h3>
                  <pre className="whitespace-pre-wrap text-xs bg-muted/40 rounded p-3 max-h-64 overflow-auto">{pdfText}</pre>
                </section>
              )}
            </div>
          )}

          {kind === "binary" && (
            <div className="text-center text-sm text-muted-foreground py-12">
              <FileQuestion className="size-10 mx-auto mb-3 opacity-50" />
              Preview not available for .{file.extension} files. You can still download or delete it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileIcon({ kind }: { kind: ReturnType<typeof kindOf> }) {
  if (kind === "image") return <ImgIcon className="size-5 text-primary" />;
  if (kind === "text" || kind === "pdf") return <FileText className="size-5 text-primary" />;
  return <FileQuestion className="size-5 text-muted-foreground" />;
}

async function parsePdf(blob: Blob): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerMod = await import(
    /* @vite-ignore */ "pdfjs-dist/build/pdf.worker.mjs?url"
  );
  const workerUrl = (workerMod as { default: string }).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const data = await blob.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const out: string[] = [];
  const max = Math.min(doc.numPages, 25);
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out.push(content.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" "));
  }
  if (doc.numPages > max) out.push(`\n… (${doc.numPages - max} more pages truncated)`);
  return out.join("\n\n").trim() || "(no embedded text — try OCR on a rendered page)";
}