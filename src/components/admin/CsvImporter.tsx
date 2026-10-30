"use client";
import Papa from "papaparse";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { FileSpreadsheet } from "lucide-react";
import { importProducts, type ImportResult, type ImportRow } from "@/actions/admin/import";

export function CsvImporter() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [done, setDone] = useState<ImportResult | null>(null);
  const [over, setOver] = useState(false);
  const [pending, start] = useTransition();

  const read = (f: File) => {
    setFileName(f.name);
    setDone(null);
    Papa.parse<ImportRow>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (r) => {
        setRows(r.data);
        start(async () => setPreview(await importProducts(r.data, true)));
      },
    });
  };

  const cols = rows[0] ? Object.keys(rows[0]).slice(0, 7) : [];
  return (
    <div className="space-y-6">
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) read(f); }}
        className={clsx("card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-12 text-center transition", over ? "border-champagne bg-champagne-50" : "border-ink/15 hover:border-ink/30")}
      >
        <FileSpreadsheet strokeWidth={1.2} className="h-10 w-10 text-ink-400" />
        <span className="text-sm">{fileName || "Drop a CSV file here, or click to choose"}</span>
        <span className="text-xs text-ink-400">Exports from Excel or Google Sheets work</span>
        <input type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      </label>

      {rows.length > 0 && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.06] p-5">
            <div>
              <p className="font-medium">{rows.length} rows ready</p>
              {preview && <p className="text-xs text-ink-500">{preview.created} new variants · {preview.updated} updates · {preview.errors.length} errors</p>}
            </div>
            <button disabled={pending || !!done || !preview || preview.created + preview.updated === 0} onClick={() => start(async () => setDone(await importProducts(rows, false)))} className="a-btn-primary">
              {pending ? "Working…" : done ? "Imported" : "Import now"}
            </button>
          </div>
          {done && <p className="bg-[#0ca30c]/10 px-5 py-3 text-sm text-[#0a7f0a]">Done: {done.created} created, {done.updated} updated. New products are saved as drafts so you can add photos before publishing.</p>}
          {(done ?? preview)?.errors.length ? (
            <ul className="space-y-1 bg-[#d03b3b]/5 px-5 py-3 text-xs text-[#b02e2e]">{(done ?? preview)!.errors.map((e) => <li key={e.row}>Row {e.row}: {e.message}</li>)}</ul>
          ) : null}
          <div className="max-h-96 overflow-auto">
            <table className="table-lux text-xs">
              <thead><tr><th>#</th>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{rows.slice(0, 50).map((r, i) => <tr key={i}><td className="text-ink-400">{i + 2}</td>{cols.map((c) => <td key={c} className="max-w-[200px] truncate">{r[c]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
