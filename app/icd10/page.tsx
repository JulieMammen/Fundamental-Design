"use client";

import Papa from "papaparse";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Candidate = { code: string; name: string };
type Status = "not_checked" | "matched" | "not_found" | "error";

type Row = {
  id: number;
  diagnosis: string;
  code: string;
  officialName: string | null;
  status: Status;
};

const SAMPLE = [
  { diagnosis: "Breast cancer, female", code: "C50.919" },
  { diagnosis: "Lung cancer", code: "C34.90" },
  { diagnosis: "Colon cancer", code: "C18.9" },
  { diagnosis: "Prostate cancer", code: "C61" },
  { diagnosis: "Pancreatic cancer", code: "C25.9" },
  { diagnosis: "Melanoma of skin", code: "C43.9" },
  { diagnosis: "Acute myeloid leukemia", code: "C92.00" },
  { diagnosis: "Multiple myeloma", code: "C90.00" },
  { diagnosis: "Kidney cancer", code: "C64.9" },
  { diagnosis: "Brain tumor, malignant", code: "C71.9" },
];

const STATUS_LABEL: Record<Status, string> = {
  not_checked: "Not checked",
  matched: "Verified",
  not_found: "Not found",
  error: "Lookup error",
};

const STATUS_CLASS: Record<Status, string> = {
  not_checked: "bg-muted text-muted-foreground",
  matched: "bg-emerald-50 text-emerald-800",
  not_found: "bg-red-50 text-red-800",
  error: "bg-amber-50 text-amber-800",
};

function normalizeCode(code: string) {
  return code.replace(".", "").trim().toUpperCase();
}

async function lookup(text: string): Promise<Candidate[]> {
  const response = await fetch(`/api/icd10/search?terms=${encodeURIComponent(text)}`);
  const payload = (await response.json()) as { candidates?: Candidate[]; error?: string };
  if (!response.ok || !payload.candidates) {
    throw new Error(payload.error ?? `Lookup failed with HTTP ${response.status}.`);
  }
  return payload.candidates;
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
}

export default function Icd10Page() {
  const [rows, setRows] = useState<Row[]>(() =>
    SAMPLE.map((item, index) => ({
      id: index + 1,
      diagnosis: item.diagnosis,
      code: item.code,
      officialName: null,
      status: "not_checked",
    })),
  );
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);

  function updateCode(id: number, code: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, code, officialName: null, status: "not_checked" } : row,
      ),
    );
  }

  async function verifyRows() {
    setVerifying(true);
    setMessage("");
    const checked = await Promise.all(
      rows.map(async (row): Promise<Row> => {
        if (!row.code.trim()) return { ...row, officialName: null, status: "not_checked" };
        try {
          const candidates = await lookup(row.code.trim());
          const match = candidates.find(
            (candidate) => normalizeCode(candidate.code) === normalizeCode(row.code),
          );
          return match
            ? { ...row, officialName: match.name, status: "matched" }
            : { ...row, officialName: null, status: "not_found" };
        } catch {
          return { ...row, officialName: null, status: "error" };
        }
      }),
    );
    setRows(checked);
    const verified = checked.filter((row) => row.status === "matched").length;
    setMessage(`${verified} of ${checked.length} codes verified against ICD-10-CM.`);
    setVerifying(false);
  }

  async function searchTerm() {
    if (!term.trim()) return;
    setSearching(true);
    setMessage("");
    try {
      setResults(await lookup(term.trim()));
    } catch (err) {
      setResults([]);
      setMessage(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function downloadCSV() {
    const csv = Papa.unparse(
      rows.map((row) => ({
        diagnosis: row.diagnosis,
        icd10cm_code: row.code,
        official_name: row.officialName ?? "",
        verified: row.status === "matched" ? "yes" : "no",
      })),
    );
    triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "oncology-icd10cm.csv");
    setMessage("Downloaded oncology-icd10cm.csv");
  }

  const verifiedCount = rows.filter((row) => row.status === "matched").length;

  return (
    <main className="min-h-screen p-8 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-4xl font-bold">ICD-10-CM oncology diagnoses</h1>
          <p className="mt-2 text-muted-foreground">
            Ten common oncology diagnoses with their ICD-10-CM codes. Each code is checked against
            the NLM Clinical Tables API, which returns the official name.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Diagnosis table</CardTitle>
            <CardDescription>
              {verifiedCount} of {rows.length} verified. Edit a code, then verify again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={verifyRows} disabled={verifying}>
                {verifying ? "Verifying…" : "Verify codes"}
              </Button>
              <Button onClick={downloadCSV} variant="outline">
                Download CSV
              </Button>
            </div>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Diagnosis</th>
                    <th className="py-2 pr-3 font-semibold">ICD-10-CM code</th>
                    <th className="py-2 pr-3 font-semibold">Official name</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-border align-top">
                      <td className="py-2 pr-3">{row.diagnosis}</td>
                      <td className="py-2 pr-3">
                        <input
                          value={row.code}
                          onChange={(event) => updateCode(row.id, event.target.value)}
                          className="w-32 rounded border border-input bg-card px-2 py-1 font-mono outline-none focus:border-ring"
                        />
                      </td>
                      <td className="py-2 pr-3">{row.officialName ?? "—"}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[row.status]}`}>
                          {STATUS_LABEL[row.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Search ICD-10-CM</CardTitle>
            <CardDescription>
              Search by code prefix (for example C50) or by a word from the diagnosis name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && searchTerm()}
                placeholder="e.g. C50 or melanoma"
                className="w-72 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring"
              />
              <Button onClick={searchTerm} disabled={searching || !term.trim()} variant="secondary">
                {searching ? "Searching…" : "Search"}
              </Button>
            </div>
            {results.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {results.map((result) => (
                  <li key={result.code} className="flex gap-4 px-4 py-2 text-sm">
                    <span className="w-24 shrink-0 font-mono font-semibold">{result.code}</span>
                    <span className="text-muted-foreground">{result.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          For prototype and demonstration use. Code verification does not confirm clinical
          coding accuracy; a qualified coder should review each assignment.
        </p>
      </div>
    </main>
  );
}
