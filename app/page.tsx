"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { ChangeEvent, useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const oncologySampleRows: LabRecord[] = [
  { sourceRecord: 1, values: { test_name: "ER Status", value: "Positive", unit: "N/A" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 2, values: { test_name: "PR Status", value: "Negative", unit: "N/A" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 3, values: { test_name: "HER2 Status", value: "Equivocal", unit: "N/A" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 4, values: { test_name: "CA-125", value: "145.2", unit: "U/mL" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 5, values: { test_name: "Hemoglobin", value: "14.5", unit: "g/dL" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 6, values: { test_name: "WBC", value: "7.2", unit: "K/uL" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 7, values: { test_name: "Platelets", value: "250", unit: "K/uL" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 8, values: { test_name: "CA 15-3", value: "28.4", unit: "U/mL" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 9, values: { test_name: "AFP", value: "2.1", unit: "ng/mL" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 10, values: { test_name: "Blast Percentage", value: "5", unit: "percent" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 11, values: { test_name: "CD5", value: "High", unit: "N/A" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 12, values: { test_name: "CD19", value: "Positive", unit: "N/A" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 13, values: { test_name: "M-Protein", value: "1.8", unit: "g/dL" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 14, values: { test_name: "Beta-2 Microglobulin", value: "2.1", unit: "mg/L" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
  { sourceRecord: 15, values: { test_name: "PSA", value: "4.2", unit: "ng/mL" }, loincCode: "", loincDisplay: "", candidates: [], searchError: "", ranking: null },
];

type SavedCSV = {
  id: string;
  fileName: string;
  createdAt: string;
};

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
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
  const [savedCSVs, setSavedCSVs] = useState<SavedCSV[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [rankingModel, setRankingModel] = useState<"gemini" | "claude">("gemini");

  useEffect(() => {
    if (isSignedIn) {
      loadSavedCSVs();
    }
  }, [isSignedIn]);

  const loadSavedCSVs = async () => {
    try {
      setIsLoadingSaved(true);
      const response = await fetch("/api/csv");
      if (response.ok) {
        const data = await response.json();
        setSavedCSVs(data);
      }
    } catch (err) {
      console.error("Error loading saved CSVs:", err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const saveCSVToDatabase = async () => {
    if (!fileName || rows.length === 0) {
      setError("Nothing to save");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          headers,
          data: rows.map((r) => r.values),
          testColumn,
          valueColumn,
          unitColumn,
        }),
      });

      if (response.ok) {
        setNotice(`✓ Saved "${fileName}" to your library`);
        await loadSavedCSVs();
        setTimeout(() => setNotice(""), 3000);
      } else {
        setError("Failed to save CSV");
      }
    } catch (err) {
      setError("Error saving CSV");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const loadCSVFromDatabase = async (id: string) => {
    try {
      const response = await fetch(`/api/csv/${id}`);
      if (response.ok) {
        const data = await response.json();
        setHeaders(data.headers);
        const newRows = data.data.map((values: Record<string, string>, i: number) => ({
          sourceRecord: i + 1,
          values,
          loincCode: "",
          loincDisplay: "",
          candidates: [],
          searchError: "",
          ranking: null,
        }));
        setRows(newRows);
        setFileName(data.fileName);
        if (data.testColumn) setTestColumn(data.testColumn);
        if (data.valueColumn) setValueColumn(data.valueColumn);
        if (data.unitColumn) setUnitColumn(data.unitColumn);
        setNotice(`✓ Loaded "${data.fileName}"`);
        setTimeout(() => setNotice(""), 2000);
      }
    } catch (err) {
      setError("Failed to load CSV");
      console.error(err);
    }
  };

  const deleteCSVFromDatabase = async (id: string) => {
    try {
      await fetch(`/api/csv/${id}`, { method: "DELETE" });
      await loadSavedCSVs();
    } catch (err) {
      setError("Failed to delete CSV");
      console.error(err);
    }
  };

  const downloadAsCSV = () => {
    const data = rows.map((row) => ({
      test_name: testColumn ? row.values[testColumn]?.trim() ?? "" : "",
      loinc_code: row.loincCode,
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}-mapped.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotice(`✓ Downloaded ${fileName}-mapped.csv`);
    setTimeout(() => setNotice(""), 2000);
  };

  const downloadAsExcel = () => {
    const data = rows.map((row) => ({
      test_name: testColumn ? row.values[testColumn]?.trim() ?? "" : "",
      loinc_code: row.loincCode,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mapped Data");
    XLSX.writeFile(workbook, `${fileName}-mapped.xlsx`);
    setNotice(`✓ Downloaded ${fileName}-mapped.xlsx`);
    setTimeout(() => setNotice(""), 2000);
  };

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

  function loadOncologySample() {
    setHeaders(sampleHeaders);
    setRows(oncologySampleRows);
    setTestColumn("test_name");
    setValueColumn("value");
    setUnitColumn("unit");
    setFileName("Oncology markers sample");
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
      setError(`Search LOINC first so ${rankingModel === "gemini" ? "Gemini" : "Claude"} can rank the returned candidates.`);
      return;
    }
    if (items.length > 100) {
      setError(`${rankingModel === "gemini" ? "Gemini" : "Claude"} can rank at most 100 unique test names at once. Split this file into smaller batches.`);
      return;
    }

    setIsRanking(true);
    setRows((current) => current.map((row) => ({ ...row, ranking: null })));
    const modelName = rankingModel === "gemini" ? "Google Gemini" : "Claude";
    setNotice(
      `Sending ${items.length} test name${items.length === 1 ? "" : "s"} and their LOINC candidates to ${modelName}. Values and units are excluded.`,
    );

    try {
      const endpoint = rankingModel === "gemini" ? "/api/loinc/rank" : "/api/loinc/rank-claude";
      const response = await fetch(endpoint, {
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
            : `${modelName} ranking failed with HTTP ${response.status}.`;
        throw new Error(message);
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("results" in payload) ||
        !Array.isArray(payload.results) ||
        !payload.results.every(isGeminiRankingResult)
      ) {
        throw new Error(`${modelName} returned ranking results in an unexpected format.`);
      }

      const rankingsByQuery = new Map(
        payload.results.map((result) => [result.query.toLocaleLowerCase(), result]),
      );
      setRows((current) =>
        current.map((row) => {
          const query = row.values[testColumn]?.trim().toLocaleLowerCase();
          const result = query ? rankingsByQuery.get(query) : undefined;
          const recommendedCandidate = result?.rankedCandidates?.find(
            (c) => c.code === result.recommendedCode
          );
          return {
            ...row,
            candidates: result?.rankedCandidates ?? row.candidates,
            loincCode: recommendedCandidate?.code ?? row.loincCode,
            loincDisplay: recommendedCandidate?.display ?? row.loincDisplay,
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
        `${modelName} auto-selected top picks. Review each recommendation before finalizing.`,
      );
    } catch (rankingError) {
      setError(
        rankingError instanceof Error
          ? rankingError.message
          : `Unable to rank the LOINC candidates with ${modelName}.`,
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
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
              Demo · synthetic data only
            </span>
            {isLoaded && (isSignedIn ? <UserButton /> : (
              <div className="flex gap-2">
                <SignInButton mode="modal" />
                <SignUpButton mode="modal" />
              </div>
            ))}
          </div>
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

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>1. Preview a CSV</CardTitle>
              <CardDescription>
                Limit: 5 MB and {MAX_RECORDS} rows. Only CSV files are accepted.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSample}
              >
                Reset to sample
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadOncologySample}
              >
                Load oncology markers
              </Button>
            </div>
          </CardHeader>
          <CardContent>

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
            {isSignedIn && (
              <Button
                onClick={saveCSVToDatabase}
                disabled={isSaving || rows.length === 0}
                size="sm"
              >
                {isSaving ? "Saving..." : "Save to Library"}
              </Button>
            )}
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
          </CardContent>
        </Card>

        {isSignedIn && savedCSVs.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Your Library</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="grid gap-2">
              {isLoadingSaved ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : (
                savedCSVs.map((csv) => (
                  <div
                    key={csv.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{csv.fileName}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(csv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => loadCSVFromDatabase(csv.id)}
                        variant="ghost"
                        size="sm"
                      >
                        Load
                      </Button>
                      <Button
                        onClick={() => deleteCSVFromDatabase(csv.id)}
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>2. Confirm your column mapping</CardTitle>
            <CardDescription>
              Choose each field explicitly. Only the test-name column is required.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card className="mt-6 overflow-hidden">
          <CardHeader className="border-b border-slate-200">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <CardTitle>3. Review LOINC mappings</CardTitle>
                <CardDescription>
                  Search unique test names, then select a candidate only after checking its clinical fit.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {rows.length} records
                </span>
                <Button
                  onClick={searchLoincCandidates}
                  disabled={!testColumn || isSearching || isRanking || rows.length === 0}
                  className="bg-teal-800 hover:bg-teal-900"
                >
                  {isSearching ? "Searching LOINC…" : "Search LOINC"}
                </Button>
                <Tabs value={rankingModel} onValueChange={(v) => setRankingModel(v as "gemini" | "claude")}>
                  <TabsList>
                    <TabsTrigger value="gemini">Gemini</TabsTrigger>
                    <TabsTrigger value="claude">Claude</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  onClick={rankLoincCandidates}
                  disabled={isSearching || isRanking || rows.every((row) => row.candidates.length === 0)}
                  variant="outline"
                >
                  {isRanking
                    ? `Ranking with ${rankingModel === "gemini" ? "Gemini" : "Claude"}…`
                    : `Rank with ${rankingModel === "gemini" ? "Gemini" : "Claude"}`}
                </Button>
                <div className="flex flex-wrap gap-2 ml-auto">
                  <Button
                    onClick={downloadAsCSV}
                    disabled={rows.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    size="sm"
                  >
                    ↓ CSV
                  </Button>
                  <Button
                    onClick={downloadAsExcel}
                    disabled={rows.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    size="sm"
                  >
                    ↓ Excel
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                                {row.ranking?.recommendedCode === candidate.code
                                  ? ` · ${rankingModel === "gemini" ? "Gemini" : "Claude"} suggestion`
                                  : ""}
                                {" · "}
                                {candidate.display}
                              </option>
                            ))}
                          </select>
                          {row.ranking && (
                            <p className="mt-1 max-w-64 text-xs text-violet-800">
                              {rankingModel === "gemini" ? "Gemini" : "Claude"}: {row.ranking.assessment.replace("_", " ")} — {row.ranking.rationale}
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
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-7 -mx-6 -mb-6 px-6 py-4">
              Only distinct test-name text is sent to the LOINC Search API when you choose Search.
              When you choose Rank with Gemini or Claude, distinct test names and candidate codes, displays,
              and lab properties are sent to the AI. Result values, units, identifiers, and
              the CSV are excluded. AI rankings are advisory: each row's top pick is pre-selected for review and can be changed or cleared by a person.
              This demo does not include user accounts or secure storage; do not enter real patient information.
            </div>
          </CardContent>
        </Card>

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
