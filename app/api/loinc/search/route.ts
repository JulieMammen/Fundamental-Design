import { NextRequest, NextResponse } from "next/server";

const LOINC_SEARCH_URL = "https://loinc.regenstrief.org/searchapi/loincs";
const MAX_QUERIES = 500;
const MAX_QUERY_LENGTH = 200;
const MAX_CANDIDATES = 5;

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

type QueryResult = {
  query: string;
  candidates: LoincCandidate[];
  error: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseCandidates(payload: unknown): LoincCandidate[] {
  if (!isRecord(payload) || !Array.isArray(payload.Results)) {
    throw new Error("LOINC returned an unrecognized response format.");
  }

  return payload.Results.slice(0, MAX_CANDIDATES).flatMap((item) => {
    if (!isRecord(item)) return [];
    const code = readString(item, "LOINC_NUM");
    const display = readString(item, "LONG_COMMON_NAME") ?? readString(item, "SHORTNAME");
    if (!code || !display) return [];

    return [
      {
        code,
        display,
        component: readString(item, "COMPONENT"),
        property: readString(item, "PROPERTY"),
        timeAspect: readString(item, "TIME_ASPCT"),
        system: readString(item, "SYSTEM"),
        scaleType: readString(item, "SCALE_TYP"),
        methodType: readString(item, "METHOD_TYP"),
      },
    ];
  });
}

async function searchLoinc(query: string, authorization: string): Promise<QueryResult> {
  const url = new URL(LOINC_SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("rows", String(MAX_CANDIDATES));

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: authorization,
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      return {
        query,
        candidates: [],
        error: "LOINC rejected the configured credentials. Check LOINC_USERNAME and LOINC_PASSWORD.",
      };
    }
    if (!response.ok) {
      return {
        query,
        candidates: [],
        error: `LOINC search failed with HTTP ${response.status}.`,
      };
    }

    const payload: unknown = await response.json();
    return { query, candidates: parseCandidates(payload), error: null };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "LOINC search timed out."
        : error instanceof Error
          ? error.message
          : "LOINC search failed unexpectedly.";
    return { query, candidates: [], error: message };
  }
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "LOINC search is disabled in production until authenticated access is implemented." },
      { status: 503 },
    );
  }

  const username = process.env.LOINC_USERNAME;
  const password = process.env.LOINC_PASSWORD;
  if (!username || !password) {
    return NextResponse.json(
      {
        error:
          "LOINC API credentials are not configured. Set LOINC_USERNAME and LOINC_PASSWORD on the server.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isRecord(body) || !Array.isArray(body.queries)) {
    return NextResponse.json({ error: "Provide a queries array." }, { status: 400 });
  }
  if (body.queries.length === 0 || body.queries.length > MAX_QUERIES) {
    return NextResponse.json(
      { error: `Provide between 1 and ${MAX_QUERIES} search queries.` },
      { status: 400 },
    );
  }
  if (
    !body.queries.every(
      (query) =>
        typeof query === "string" &&
        query.trim().length > 0 &&
        query.trim().length <= MAX_QUERY_LENGTH,
    )
  ) {
    return NextResponse.json(
      { error: `Each query must contain 1 to ${MAX_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const uniqueQueries = [
    ...new Map(
      (body.queries as string[]).map((query) => {
        const normalized = query.trim();
        return [normalized.toLocaleLowerCase(), normalized] as const;
      }),
    ).values(),
  ];
  const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  const results: QueryResult[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < uniqueQueries.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await searchLoinc(uniqueQueries[index], authorization);
    }
  }

  await Promise.all(Array.from({ length: Math.min(3, uniqueQueries.length) }, worker));

  const failedCount = results.filter((result) => result.error).length;
  return NextResponse.json({
    results,
    failedCount,
    searchedCount: uniqueQueries.length,
  });
}
