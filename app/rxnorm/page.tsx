"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";

type Candidate = {
  rxcui: string;
  name: string;
  tty: string | null;
  score: number | null;
};

type Row = {
  id: number;
  brand: string;
  generic: string;
  dose: string;
  unit: string;
  candidates: Candidate[];
  selected: string;
  assessment: string | null;
  rationale: string;
  error: string;
};

type Drug = { brand: string; generic: string; dose: string; unit: string };
type SearchResult = { query: string; candidates: Candidate[]; error: string | null };
type RankResult = {
  query: string;
  recommendedRxcui: string | null;
  assessment: string;
  rationale: string;
};

const SAMPLE_NAME = "oncology-drugs-sample";
const SAMPLE_DRUGS: Drug[] = [
  { brand: "Gleevec", generic: "imatinib", dose: "400", unit: "mg" },
  { brand: "Xeloda", generic: "capecitabine", dose: "500", unit: "mg" },
  { brand: "Tykerb", generic: "lapatinib", dose: "250", unit: "mg" },
  { brand: "Tarceva", generic: "erlotinib", dose: "150", unit: "mg" },
  { brand: "Temodar", generic: "temozolomide", dose: "100", unit: "mg" },
  { brand: "Femara", generic: "letrozole", dose: "2.5", unit: "mg" },
  { brand: "Arimidex", generic: "anastrozole", dose: "1", unit: "mg" },
  { brand: "Nolvadex", generic: "tamoxifen", dose: "20", unit: "mg" },
  { brand: "Zytiga", generic: "abiraterone", dose: "250", unit: "mg" },
  { brand: "Trexall", generic: "methotrexate", dose: "2.5", unit: "mg" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 50;

function toRow(drug: Drug, id: number): Row {
  return {
    ...drug,
    id,
    candidates: [],
    selected: "",
    assessment: null,
    rationale: "",
    error: "",
  };
}

function queryFor(row: Row) {
  return [row.generic, row.dose, row.unit]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ");
}

export default function RxNormPage() {
  const [rows, setRows] = useState<Row[]>(() => SAMPLE_DRUGS.map((drug, index) => toRow(drug, index + 1)));
  const [fileName, setFileName] = useState(SAMPLE_NAME);
  const [busy, setBusy] = useState<"" | "search" | "rank">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateRow(id: number, changes: Partial<Row>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...changes } : row)));
  }

  function loadRows(drugs: Drug[], name: string) {
    setRows(drugs.map((drug, index) => toRow(drug, index + 1)));
    setFileName(name);
    setError("");
    setMessage("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setMessage("");
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a CSV file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("This file is larger than 5 MB. Choose a smaller CSV.");
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (result) => {
        if (result.errors.length > 0) {
          setError(`Could not read the CSV cleanly: ${result.errors[0].message}`);
          return;
        }
        const drugs: Drug[] = result.data
          .map((record) => ({
            brand: (record.brand_name ?? record.brand ?? "").trim(),
            generic: (record.generic_name ?? record.generic ?? "").trim(),
            dose: (record.dose ?? "").trim(),
            unit: (record.unit ?? "").trim(),
          }))
          .filter((drug) => drug.brand || drug.generic);

        if (drugs.length === 0) {
          setError("The CSV needs a header row and at least one data row.");
          return;
        }
        if (drugs.every((drug) => !drug.generic)) {
          setError("Add a generic_name column with the generic drug names.");
          return;
        }
        if (drugs.length > MAX_ROWS) {
          setError(`This file has more than ${MAX_ROWS} rows. Split it into smaller files.`);
          return;
        }
        loadRows(drugs, file.name.replace(/\.csv$/i, ""));
      },
      error: () => setError("The selected CSV could not be read."),
    });
  }

  async function postJson<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as T & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? `Request failed with HTTP ${response.status}.`);
    }
    return payload;
  }

  async function searchRows() {
    setError("");
    setMessage("");
    const queries = rows.map(queryFor).filter((query) => query.length > 0);
    if (queries.length === 0) {
      setError("Each row needs a generic name to search.");
      return;
    }

    setBusy("search");
    try {
      const payload = await postJson<{ results: SearchResult[] }>("/api/rxnorm/search", { queries });
      const byQuery = new Map(payload.results.map((result) => [result.query.toLocaleLowerCase(), result]));
      setRows((current) =>
        current.map((row) => {
          const result = byQuery.get(queryFor(row).toLocaleLowerCase());
          return {
            ...row,
            candidates: result?.candidates ?? [],
            selected: "",
            assessment: null,
            rationale: "",
            error: result ? (result.error ?? "") : "No search result returned.",
          };
        }),
      );
      setMessage("RxNorm search complete. Rank with Claude to pre-select the best match, or choose one yourself.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "RxNorm search failed.");
    } finally {
      setBusy("");
    }
  }

  async function rankRows() {
    setError("");
    setMessage("");
    const items = rows
      .filter((row) => row.candidates.length > 0)
      .map((row) => ({
        query: queryFor(row),
        brand: row.brand,
        generic: row.generic,
        dose: row.dose,
        unit: row.unit,
        candidates: row.candidates,
      }));
    if (items.length === 0) {
      setError("Search RxNorm first so Claude has candidates to rank.");
      return;
    }

    setBusy("rank");
    try {
      const payload = await postJson<{ results: RankResult[] }>("/api/rxnorm/rank", { items });
      const byQuery = new Map(payload.results.map((result) => [result.query.toLocaleLowerCase(), result]));
      setRows((current) =>
        current.map((row) => {
          const result = byQuery.get(queryFor(row).toLocaleLowerCase());
          return result
            ? {
                ...row,
                selected: result.recommendedRxcui ?? "",
                assessment: result.assessment,
                rationale: result.rationale,
              }
            : row;
        }),
      );
      setMessage("Claude pre-selected its top pick for each row. Review each one before using it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claude ranking failed.");
    } finally {
      setBusy("");
    }
  }

  function exportData() {
    return rows.map((row) => {
      const chosen = row.candidates.find((candidate) => candidate.rxcui === row.selected);
      return {
        brand_name: row.brand,
        generic_name: row.generic,
        dose: row.dose,
        unit: row.unit,
        rxcui: chosen?.rxcui ?? "",
        rxnorm_name: chosen?.name ?? "",
        claude_assessment: row.assessment ?? "",
      };
    });
  }

  function triggerDownload(blob: Blob, filename: string) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage(`Downloaded ${filename}`);
  }

  function downloadCSV() {
    const csv = Papa.unparse(exportData());
    triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${fileName}-rxnorm.csv`);
  }

  function downloadExcel() {
    const worksheet = XLSX.utils.json_to_sheet(exportData());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RxNorm");
    XLSX.writeFile(workbook, `${fileName}-rxnorm.xlsx`);
    setMessage(`Downloaded ${fileName}-rxnorm.xlsx`);
  }

  function resetSample() {
    loadRows(SAMPLE_DRUGS, SAMPLE_NAME);
  }

  const inputClass =
    "w-full rounded border border-input bg-card px-2 py-1 text-foreground outline-none focus:border-ring";

  return (
    <main className="min-h-screen p-8 text-foreground">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold">RxNorm drug review</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a CSV or use the 10-drug oncology sample. RxNav proposes RxNorm candidates for each
          row, Claude pre-selects the best one, and you confirm or change it.
        </p>

        <label
          htmlFor="rxnorm-csv-file"
          className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40 px-4 py-6 text-center transition hover:border-primary"
        >
          <span className="text-sm font-semibold text-foreground">Choose a CSV file</span>
          <span className="mt-1 text-xs text-muted-foreground">
            Columns: brand_name, generic_name, dose, unit. Max 5 MB and {MAX_ROWS} rows.
          </span>
          <input
            id="rxnorm-csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="mr-2 text-sm font-medium text-foreground">Dataset: {fileName}</span>
          <Button
            onClick={resetSample}
            disabled={busy !== ""}
            variant="outline"
          >
            Reset to sample
          </Button>
          <Button
            onClick={searchRows}
            disabled={busy !== ""}
          >
            {busy === "search" ? "Searching RxNav…" : "Search RxNorm"}
          </Button>
          <Button
            onClick={rankRows}
            disabled={busy !== ""}
          >
            {busy === "rank" ? "Ranking with Claude…" : "Rank with Claude"}
          </Button>
          <Button
            onClick={downloadCSV}
            variant="outline"
          >
            Download CSV
          </Button>
          <Button
            onClick={downloadExcel}
            variant="outline"
          >
            Download Excel
          </Button>
        </div>
        {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="mt-6 overflow-x-auto rounded-lg bg-card shadow-sm p-4">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-semibold">Brand</th>
                <th className="py-2 pr-3 font-semibold">Generic</th>
                <th className="py-2 pr-3 font-semibold">Dose</th>
                <th className="py-2 pr-3 font-semibold">Unit</th>
                <th className="py-2 pr-3 font-semibold">RxNorm candidate</th>
                <th className="py-2 pr-3 font-semibold">Selected RxCUI</th>
                <th className="py-2 font-semibold">Claude assessment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const chosen = row.candidates.find((candidate) => candidate.rxcui === row.selected);
                return (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="py-2 pr-3">
                      <input
                        className={inputClass}
                        value={row.brand}
                        onChange={(event) => updateRow(row.id, { brand: event.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        className={inputClass}
                        value={row.generic}
                        onChange={(event) => updateRow(row.id, { generic: event.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        className={inputClass}
                        value={row.dose}
                        onChange={(event) => updateRow(row.id, { dose: event.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        className={inputClass}
                        value={row.unit}
                        onChange={(event) => updateRow(row.id, { unit: event.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        className={inputClass}
                        value={row.selected}
                        disabled={row.candidates.length === 0}
                        onChange={(event) => updateRow(row.id, { selected: event.target.value })}
                      >
                        <option value="">
                          {row.candidates.length === 0 ? "No candidates yet" : "Choose a candidate"}
                        </option>
                        {row.candidates.map((candidate) => (
                          <option key={candidate.rxcui} value={candidate.rxcui}>
                            {candidate.rxcui} · {candidate.name} ({candidate.tty ?? "?"})
                          </option>
                        ))}
                      </select>
                      {row.error && <p className="mt-1 text-xs text-amber-700">{row.error}</p>}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-mono">{chosen?.rxcui ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{chosen?.name ?? ""}</div>
                    </td>
                    <td className="py-2">
                      {row.assessment ? (
                        <>
                          <div className="font-semibold capitalize">{row.assessment.replace("_", " ")}</div>
                          <div className="mt-1 max-w-xs text-xs text-muted-foreground">{row.rationale}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Not ranked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Matches and Claude suggestions are advisory. Choose or confirm each RxCUI yourself before using it.
        </p>
      </div>
    </main>
  );
}
