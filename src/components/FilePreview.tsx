import { useEffect, useState } from "react";
import { Download, X, ScanText, Loader2, FileText, Image as ImgIcon, FileQuestion, Archive, Table as TableIcon, Presentation } from "lucide-react";
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
const DOCX_EXTS = new Set(["docx"]);
const XLSX_EXTS = new Set(["xlsx", "xls", "ods"]);
const PPTX_EXTS = new Set(["pptx"]);
const ZIP_EXTS = new Set(["zip", "jar", "apk", "epub"]);

export function kindOf(
  ext: string,
): "text" | "image" | "audio" | "video" | "pdf" | "docx" | "xlsx" | "pptx" | "zip" | "binary" {
  if (TEXT_EXTS.has(ext)) return "text";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (PDF_EXTS.has(ext)) return "pdf";
  if (DOCX_EXTS.has(ext)) return "docx";
  if (XLSX_EXTS.has(ext)) return "xlsx";
  if (PPTX_EXTS.has(ext)) return "pptx";
  if (ZIP_EXTS.has(ext)) return "zip";
  return "binary";
}

export function FilePreview({ file, onClose }: { file: StoredFile; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [sheets, setSheets] = useState<{ name: string; rows: string[][] }[] | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [zipEntries, setZipEntries] = useState<{ path: string; size: number; dir: boolean }[] | null>(null);
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
    setText(null); setPdfText(null); setOcrText(null); setHtml(null);
    setSheets(null); setActiveSheet(0); setZipEntries(null); setErr(null);
    (async () => {
      try {
        if (kind === "text") {
          const t = await file.blob.text();
          if (!abort) setText(t.slice(0, 200_000));
        } else if (kind === "pdf") {
          setBusy("Parsing PDF…");
          const text = await parsePdf(file.blob);
          if (!abort) setPdfText(text);
        } else if (kind === "docx") {
          setBusy("Rendering DOCX…");
          const mammoth = await import("mammoth");
          const arrayBuffer = await file.blob.arrayBuffer();
          const res = await mammoth.convertToHtml({ arrayBuffer });
          if (!abort) setHtml(res.value || "<em>(empty document)</em>");
        } else if (kind === "xlsx") {
          setBusy("Parsing spreadsheet…");
          const XLSX = await import("xlsx");
          const buf = await file.blob.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });
          const parsed = wb.SheetNames.map((n) => ({
            name: n,
            rows: (XLSX.utils.sheet_to_json(wb.Sheets[n], {
              header: 1,
              blankrows: false,
              defval: "",
            }) as unknown[][]).slice(0, 500).map((r) => r.map((c) => String(c ?? ""))),
          }));
          if (!abort) setSheets(parsed);
        } else if (kind === "pptx") {
          setBusy("Extracting slides…");
          const txt = await parsePptx(file.blob);
          if (!abort) setText(txt);
        } else if (kind === "zip") {
          setBusy("Reading archive…");
          const JSZip = (await import("jszip")).default;
          const zip = await JSZip.loadAsync(await file.blob.arrayBuffer());
          const entries: { path: string; size: number; dir: boolean }[] = [];
          zip.forEach((path, e) => {
            entries.push({ path, size: (e as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0, dir: e.dir });
          });
          entries.sort((a, b) => a.path.localeCompare(b.path));
          if (!abort) setZipEntries(entries);
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

          {kind === "docx" && html && (
            <div
              className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded p-4"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}

          {kind === "xlsx" && sheets && sheets.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {sheets.map((s, i) => (
                  <button
                    key={s.name}
                    onClick={() => setActiveSheet(i)}
                    className={`text-xs px-2.5 py-1 rounded border ${i === activeSheet ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="overflow-auto max-h-[60vh] rounded border border-border">
                <table className="text-xs w-full">
                  <tbody>
                    {sheets[activeSheet].rows.map((row, ri) => (
                      <tr key={ri} className={ri === 0 ? "bg-muted/60 font-semibold" : "odd:bg-muted/20"}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="border border-border px-2 py-1 whitespace-nowrap">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-muted-foreground">
                Showing first {sheets[activeSheet].rows.length} rows of "{sheets[activeSheet].name}".
              </div>
            </div>
          )}

          {kind === "pptx" && text !== null && (
            <pre className="whitespace-pre-wrap text-sm bg-muted/40 rounded p-3 max-h-[70vh] overflow-auto">{text || "(no text extracted)"}</pre>
          )}

          {kind === "zip" && zipEntries && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{zipEntries.length} entries</div>
              <div className="rounded border border-border divide-y divide-border max-h-[70vh] overflow-auto">
                {zipEntries.map((e) => (
                  <div key={e.path} className="flex items-center justify-between px-3 py-1.5 text-xs font-mono">
                    <span className="truncate">{e.dir ? "📁 " : "📄 "}{e.path}</span>
                    {!e.dir && <span className="text-muted-foreground ml-3">{formatBytes(e.size)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileIcon({ kind }: { kind: ReturnType<typeof kindOf> }) {
  if (kind === "image") return <ImgIcon className="size-5 text-primary" />;
  if (kind === "text" || kind === "pdf" || kind === "docx") return <FileText className="size-5 text-primary" />;
  if (kind === "xlsx") return <TableIcon className="size-5 text-primary" />;
  if (kind === "pptx") return <Presentation className="size-5 text-primary" />;
  if (kind === "zip") return <Archive className="size-5 text-primary" />;
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

async function parsePptx(blob: Blob): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const slideFiles = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)/)?.[1] ?? 0);
      return na - nb;
    });
  const out: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");
    const texts = Array.from(xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)).map((m) => m[1]);
    out.push(`── Slide ${i + 1} ──\n${texts.join("\n") || "(no text)"}`);
  }
  return out.join("\n\n");
}