"use client";

import Papa from "papaparse";
import { ChangeEvent, useMemo, useState } from "react";

type LabRecord = {
  sourceRecord: number;
  values: Record<string, string>;
  loincCode: string;
  loincDisplay: string;
  candidates: LoincCandidate[];
  searchError: string;
  ranking: LoincRanking | null;
};

type LoincCandidate = {
  code: string;
  display: string;
  component: string | null;
  property: string | null;
  timeAspect: string | null;
  system: string | null;
  scaleType: string | null;
  methodType: string | null;
};

type LoincQueryResult = {
  query: string;
  candidates: LoincCandidate[];
  error: string | null;
};

type LoincRanking = {
  recommendedCode: string | null;
  assessment: "strong" | "moderate" | "weak" | "no_match";
  rationale: string;
  rankedCandidates: LoincCandidate[];
};

type GeminiRankingResult = LoincRanking & {
  query: string;
};

function isGeminiRankingResult(value: unknown): value is GeminiRankingResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "query" in value &&
    typeof value.query === "string" &&
    "recommendedCode" in value &&
    (typeof value.recommendedCode === "string" || value.recommendedCode === null) &&
    "assessment" in value &&
    ["strong", "moderate", "weak", "no_match"].includes(value.assessment as string) &&
    "rationale" in value &&
    typeof value.rationale === "string" &&
    "rankedCandidates" in value &&
    Array.isArray(value.rankedCandidates) &&
    value.rankedCandidates.every(
      (candidate) =>
        typeof candidate === "object" &&
        candidate !== null &&
        "code" in candidate &&
        typeof candidate.code === "string" &&
        "display" in candidate &&
        typeof candidate.display === "string",
    )
  );
}

function isLoincQueryResult(value: unknown): value is LoincQueryResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "query" in value &&
    typeof value.query === "string" &&
    "candidates" in value &&
    Array.isArray(value.candidates) &&
    "error" in value &&
    (typeof value.error === "string" || value.error === null)
  );
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_RECORDS = 500;

const sampleHeaders = ["test_name", "value", "unit"];
const sampleRows: LabRecord[] = [
  { sourceRecord: 1, values: { test_name: "Hemoglobin", value: "13.8", unit: "g/dL" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 2, values: { test_name: "White blood cell count", value: "6.2", unit: "10*9/L" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 3, values: { test_name: "Platelet count", value: "245", unit: "10*9/L" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 4, values: { test_name: "Creatinine", value: "0.9", unit: "mg/dL" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 5, values: { test_name: "Glucose", value: "98", unit: "mg/dL" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
];

export default function Home() {
  const [headers, setHeaders] = useState(sampleHeaders);
  const [rows, setRows] = useState(sampleRows);
  const [testColumn, setTestColumn] = useState("test_name");
  const [valueColumn, setValueColumn] = useState("value");
  const [unitColumn, setUnitColumn] = useState("unit");
  const [fileName, setFileName] = useState("Synthetic sample data");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isRanking, setIsRanking] = useState(false);

  const mappedCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          Boolean(testColumn && row.values[testColumn]?.trim()) &&
          row.loincCode.trim() &&
          row.loincDisplay.trim(),
      ).length,
    [rows, testColumn],
  );

  function loadSample() {
    setHeaders(sampleHeaders);
    setRows(sampleRows);
    setTestColumn("test_name");
    setValueColumn("value");
    setUnitColumn("unit");
    setFileName("Synthetic sample data");
    setError("");
    setNotice("");
    setIsSearching(false);
    setIsRanking(false);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");
    setNotice("");

    if (!file) return;
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
      complete: (result) => {
        const nextHeaders = result.meta.fields?.filter(Boolean) ?? [];
        const dataRows = result.data;

        if (result.errors.length > 0) {
          setError(`Could not read the CSV cleanly: ${result.errors[0].message}`);
          return;
        }
        if (nextHeaders.length === 0 || dataRows.length === 0) {
          setError("The CSV needs a header row and at least one data row.");
          return;
        }
        if (dataRows.length > MAX_RECORDS) {
          setError(`This file has more than ${MAX_RECORDS} rows. Split it into smaller files.`);
          return;
        }

        setHeaders(nextHeaders);
        setRows(
          dataRows.map((values, index) => ({
            sourceRecord: index + 1,
            values,
            loincCode: "",
            loincDisplay: "",
            candidates: [],
            searchError: "",
            ranking: null,
          })),
        );
        setTestColumn("");
        setValueColumn("");
        setUnitColumn("");
        setFileName(file.name);
        setNotice("File is being previewed in this browser only; it is not uploaded or saved.");
      },
      error: () => setError("The selected CSV could not be read."),
    });
  }

  function updateMapping(index: number, key: "loincCode" | "loincDisplay", value: string) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  }

  async function searchLoincCandidates() {
    setError("");
    setNotice("");
    if (!testColumn) {
      setError("Select the test-name column before searching LOINC.");
      return;
    }

    const queries = [
      ...new Map(
        rows
          .map((row) => row.values[testColumn]?.trim() ?? "")
          .filter(Boolean)
          .map((query) => [query.toLocaleLowerCase(), query] as const),
      ).values(),
    ];
    if (queries.length === 0) {
      setError("There are no non-empty test names to search.");
      return;
    }

    setIsSearching(true);
    setRows((current) =>
      current.map((row) => ({
        ...row,
        candidates: [],
        searchError: "",
        ranking: null,
      })),
    );
    setNotice(
      `Sending ${queries.length} unique test-name${queries.length === 1 ? "" : "s"} to LOINC. Result values and units are not sent.`,
    );

    try {
      const response = await fetch("/api/loinc/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : `LOINC search failed with HTTP ${response.status}.`;
        throw new Error(message);
      }

      if (
        typeof payload !== "object" ||
        payload === null ||
        !("results" in payload) ||
        !Array.isArray(payload.results) ||
        !payload.results.every(isLoincQueryResult)
      ) {
        throw new Error("The LOINC search route returned an unrecognized response.");
      }

      const resultsByQuery = new Map(
        payload.results.map((result) => [
          result.query.toLocaleLowerCase(),
          result,
        ]),
      );
      setRows((current) =>
        current.map((row) => {
          const query = row.values[testColumn]?.trim().toLocaleLowerCase();
          const result = query ? resultsByQuery.get(query) : undefined;
          return {
            ...row,
            candidates: result?.candidates ?? [],
            searchError: result?.error ?? "",
            ranking: null,
          };
        }),
      );
      const failedCount =
        "failedCount" in payload && typeof payload.failedCount === "number"
          ? payload.failedCount
          : 0;
      const searchedCount =
        "searchedCount" in payload && typeof payload.searchedCount === "number"
          ? payload.searchedCount
          : queries.length;
      setNotice(
        `Searched ${searchedCount} unique test names. ${
          failedCount ? `${failedCount} searches failed; see affected rows.` : "Check each candidate before selecting it."
        }`,
      );
    } catch (searchError) {
      setError(
        searchError instanceof Error ? searchError.message : "Unable to complete LOINC search.",
      );
      setNotice("");
    } finally {
      setIsSearching(false);
    }
  }

  async function rankLoincCandidates() {
    setError("");
    setNotice("");
    if (!testColumn) {
      setError("Select the test-name column before ranking candidates.");
      return;
    }

    const items = [
      ...new Map(
        rows
          .filter((row) => row.candidates.length > 0)
          .map((row) => {
            const query = row.values[testColumn]?.trim() ?? "";
            return [
              query.toLocaleLowerCase(),
              { query, candidates: row.candidates },
            ] as const;
          }),
      ).values(),
    ];
    if (items.length === 0) {
      setError("Search LOINC first so Gemini can rank the returned candidates.");
      return;
    }
    if (items.length > 100) {
      setError("Gemini can rank at most 100 unique test names at once. Split this file into smaller batches.");
      return;
    }

    setIsRanking(true);
    setRows((current) => current.map((row) => ({ ...row, ranking: null })));
    setNotice(
      `Sending ${items.length} test name${items.length === 1 ? "" : "s"} and their LOINC candidates to Google Gemini. Values and units are excluded.`,
    );

    try {
      const response = await fetch("/api/loinc/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : `Gemini ranking failed with HTTP ${response.status}.`;
        throw new Error(message);
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("results" in payload) ||
        !Array.isArray(payload.results) ||
        !payload.results.every(isGeminiRankingResult)
      ) {
        throw new Error("Gemini returned ranking results in an unexpected format.");
      }

      const rankingsByQuery = new Map(
        payload.results.map((result) => [result.query.toLocaleLowerCase(), result]),
      );
      setRows((current) =>
        current.map((row) => {
          const query = row.values[testColumn]?.trim().toLocaleLowerCase();
          const result = query ? rankingsByQuery.get(query) : undefined;
          return {
            ...row,
            candidates: result?.rankedCandidates ?? row.candidates,
            ranking: result
              ? {
                  recommendedCode: result.recommendedCode,
                  assessment: result.assessment,
                  rationale: result.rationale,
                  rankedCandidates: result.rankedCandidates,
                }
              : null,
          };
        }),
      );
      setNotice(
        "Gemini ranked the candidates as an advisory suggestion. Review each recommendation; nothing was selected automatically.",
      );
    } catch (rankingError) {
      setError(
        rankingError instanceof Error
          ? rankingError.message
          : "Unable to rank the LOINC candidates with Gemini.",
      );
      setNotice("");
    } finally {
      setIsRanking(false);
    }
  }

  function selectCandidate(index: number, candidateCode: string) {
    const candidate = rows[index]?.candidates.find((item) => item.code === candidateCode);
    if (!candidate) return;
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, loincCode: candidate.code, loincDisplay: candidate.display }
          : row,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7f6] text-slate-900">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-800 text-lg font-bold text-white">
              T
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-teal-800">TERMMAP</p>
              <p className="text-xs text-slate-500">Lab terminology review workspace</p>
            </div>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
            Demo · synthetic data only
          </span>
        </header>

        <section className="mb-8 max-w-3xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-teal-800">
            Review before you map
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Lab results, ready for terminology review.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Preview a small CSV, choose its test-name column, and search LOINC for candidates.
            Every suggested code still needs human review before use.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="Import summary">
          <SummaryCard label="Source records" value={rows.length} detail="In this browser session" />
          <SummaryCard label="Reviewed mappings" value={mappedCount} detail="Code and display entered" />
          <SummaryCard label="Need review" value={rows.length - mappedCount} detail="No confirmed mapping yet" />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">1. Preview a CSV</h2>
              <p className="mt-1 text-sm text-slate-500">
                Limit: 5 MB and {MAX_RECORDS} rows. Only CSV files are accepted.
              </p>
            </div>
            <button
              type="button"
              onClick={loadSample}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset to sample
            </button>
          </div>

          <label
            htmlFor="csv-file"
            className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-teal-600 hover:bg-teal-50/40"
          >
            <span className="text-sm font-semibold text-slate-800">Choose a CSV file</span>
            <span className="mt-1 text-sm text-slate-500">or keep using the synthetic sample</span>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-slate-700">{fileName}</span>
            <span className="text-slate-500">CSV data-record references are retained in the preview.</span>
          </div>
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-3 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
              {notice}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div>
            <h2 className="text-lg font-semibold">2. Confirm your column mapping</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose each field explicitly. Only the test-name column is required.
            </p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <ColumnSelect
              label="Test name (required)"
              value={testColumn}
              options={headers}
              onChange={(value) => {
                setTestColumn(value);
                setRows((current) =>
                  current.map((row) => ({
                    ...row,
                    candidates: [],
                    searchError: "",
                    ranking: null,
                  })),
                );
              }}
            />
            <ColumnSelect label="Result value (optional)" value={valueColumn} options={headers} onChange={setValueColumn} />
            <ColumnSelect label="Unit (optional)" value={unitColumn} options={headers} onChange={setUnitColumn} />
          </div>
          {!testColumn && (
            <p className="mt-4 text-sm font-medium text-amber-800">
              Select the column containing the laboratory test name to review records.
            </p>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-7">
            <div>
              <h2 className="text-lg font-semibold">3. Review LOINC mappings</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search unique test names, then select a candidate only after checking its clinical fit.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {rows.length} records
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={searchLoincCandidates}
                  disabled={!testColumn || isSearching || isRanking || rows.length === 0}
                  className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSearching ? "Searching LOINC…" : "Search LOINC"}
                </button>
                <button
                  type="button"
                  onClick={rankLoincCandidates}
                  disabled={isSearching || isRanking || rows.every((row) => row.candidates.length === 0)}
                  className="rounded-xl border border-teal-800 px-4 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRanking ? "Ranking with Gemini…" : "Rank with Gemini"}
                </button>
              </div>
            </div>
          </div>

          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold sm:px-7">Data record</th>
                    <th className="px-4 py-3 font-semibold">Test / result</th>
                    <th className="px-4 py-3 font-semibold">LOINC candidates</th>
                    <th className="px-4 py-3 font-semibold">Selected code</th>
                    <th className="px-4 py-3 font-semibold">LOINC display</th>
                    <th className="px-5 py-3 font-semibold sm:px-7">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, index) => {
                    const hasMapping = Boolean(
                      testColumn &&
                        row.values[testColumn]?.trim() &&
                        row.loincCode.trim() &&
                        row.loincDisplay.trim(),
                    );
                    return (
                      <tr key={row.sourceRecord} className="align-top">
                        <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-500 sm:px-7">
                          {row.sourceRecord}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-900">
                            {testColumn ? row.values[testColumn] || "Missing test name" : "Select a test-name column"}
                          </p>
                          {(valueColumn || unitColumn) && (
                            <p className="mt-1 text-xs text-slate-500">
                              {[valueColumn && row.values[valueColumn], unitColumn && row.values[unitColumn]]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`LOINC candidate for source row ${row.sourceRecord}`}
                            value={row.candidates.some((candidate) => candidate.code === row.loincCode) ? row.loincCode : ""}
                            onChange={(event) => selectCandidate(index, event.target.value)}
                            disabled={row.candidates.length === 0}
                            className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
                          >
                            <option value="">
                              {row.searchError
                                ? "Search failed"
                                : row.candidates.length
                                  ? "Choose a candidate"
                                  : "Search to get candidates"}
                            </option>
                            {row.candidates.map((candidate) => (
                              <option key={candidate.code} value={candidate.code}>
                                {candidate.code}
                                {row.ranking?.recommendedCode === candidate.code ? " · Gemini suggestion" : ""}
                                {" · "}
                                {candidate.display}
                              </option>
                            ))}
                          </select>
                          {row.ranking && (
                            <p className="mt-1 max-w-64 text-xs text-violet-800">
                              Gemini: {row.ranking.assessment.replace("_", " ")} — {row.ranking.rationale}
                            </p>
                          )}
                          {row.searchError && (
                            <p className="mt-1 max-w-64 text-xs text-rose-700">{row.searchError}</p>
                          )}
                          {row.candidates.length > 0 && (
                            <p className="mt-1 max-w-64 text-xs text-slate-500">
                              {row.candidates.length} candidate{row.candidates.length === 1 ? "" : "s"} returned
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            aria-label={`LOINC code for source row ${row.sourceRecord}`}
                            value={row.loincCode}
                            onChange={(event) => updateMapping(index, "loincCode", event.target.value)}
                            placeholder="e.g. code"
                            className="w-36 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            aria-label={`LOINC display for source row ${row.sourceRecord}`}
                            value={row.loincDisplay}
                            onChange={(event) => updateMapping(index, "loincDisplay", event.target.value)}
                            placeholder="Confirmed display"
                            className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                          />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 sm:px-7">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              hasMapping
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {hasMapping ? "Entered" : "Needs review"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-7 py-10 text-center text-sm text-slate-500">No records to review.</p>
          )}
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-7">
            Only distinct test-name text is sent to the LOINC Search API when you choose Search.
            When you choose Rank with Gemini, distinct test names and candidate codes, displays,
            and lab properties are sent to Google Gemini. Result values, units, identifiers, and
            the CSV are excluded. AI rankings are advisory and never select a code automatically.
            This demo does not include user accounts or secure storage; do not enter real patient information.
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-slate-500">
          TermMap demo · CSV stays on this device · Use synthetic data only
        </footer>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function ColumnSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
        <option value="">Do not map</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
