"use client";

import Link from "next/link";
import { useState } from "react";

type RxNormCandidate = {
  rxcui: string;
  name: string;
  tty: string | null;
  score: number | null;
};

type QueryResult = {
  query: string;
  candidates: RxNormCandidate[];
  error: string | null;
};

type SearchResponse = {
  results?: QueryResult[];
  failedCount?: number;
  searchedCount?: number;
  error?: string;
};

const MAX_QUERIES = 50;

export default function RxNormPage() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<QueryResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const queries = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  async function search() {
    setError("");
    if (queries.length === 0) {
      setError("Enter at least one drug name, one per line.");
      return;
    }
    if (queries.length > MAX_QUERIES) {
      setError(`Search up to ${MAX_QUERIES} drug names at a time.`);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch("/api/rxnorm/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries }),
      });
      const payload = (await response.json()) as SearchResponse;
      if (!response.ok || !payload.results) {
        throw new Error(payload.error ?? `RxNorm search failed with HTTP ${response.status}.`);
      }
      setResults(payload.results);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : "RxNorm search failed.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-slate-300 hover:text-white">
          ← Back to home
        </Link>

        <h1 className="mt-4 text-4xl font-bold">RxNorm drug lookup</h1>
        <p className="mt-2 text-slate-300">
          Enter one drug name per line. Matches come from the NLM RxNav API and show the RxNorm
          concept ID (RxCUI), name, and term type (TTY).
        </p>

        <div className="mt-6 rounded-lg bg-slate-700 p-6">
          <label htmlFor="drug-names" className="block text-sm font-semibold text-slate-200">
            Drug names ({queries.length} of {MAX_QUERIES} max)
          </label>
          <textarea
            id="drug-names"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            placeholder={"aspirin\nmetformin 500 mg\nlisinopril"}
            className="mt-2 block w-full rounded-lg border border-slate-500 bg-slate-800 p-3 text-slate-100 placeholder-slate-500 outline-none focus:border-blue-400"
          />
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={search}
              disabled={isSearching}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearching ? "Searching RxNav…" : "Search RxNorm"}
            </button>
            {error && <p className="text-sm text-red-300">{error}</p>}
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {results.map((result) => (
            <section key={result.query} className="rounded-lg bg-slate-700 p-6">
              <h2 className="text-xl font-bold">{result.query}</h2>
              {result.error ? (
                <p className="mt-2 text-sm text-amber-300">{result.error}</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="py-2 pr-4 font-semibold">RxCUI</th>
                        <th className="py-2 pr-4 font-semibold">Name</th>
                        <th className="py-2 pr-4 font-semibold">TTY</th>
                        <th className="py-2 font-semibold">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.candidates.map((candidate) => (
                        <tr key={candidate.rxcui} className="border-t border-slate-600">
                          <td className="py-2 pr-4 font-mono">{candidate.rxcui}</td>
                          <td className="py-2 pr-4">{candidate.name}</td>
                          <td className="py-2 pr-4">{candidate.tty ?? "—"}</td>
                          <td className="py-2">{candidate.score ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
