import { NextRequest, NextResponse } from "next/server";

const RXNAV_BASE_URL = "https://rxnav.nlm.nih.gov/REST";
const MAX_QUERIES = 50;
const MAX_QUERY_LENGTH = 200;
const MAX_CANDIDATES = 10;
const QUERY_BATCH_SIZE = 5;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`RxNav returned HTTP ${response.status}.`);
  }
  return response.json();
}

async function fetchName(rxcui: string): Promise<{ name: string; tty: string | null } | null> {
  const payload = await getJson(
    new URL(`${RXNAV_BASE_URL}/rxcui/${encodeURIComponent(rxcui)}/properties.json`),
  );
  if (!isRecord(payload) || !isRecord(payload.properties)) return null;

  const { name, tty } = payload.properties;
  if (typeof name !== "string") return null;
  return { name, tty: typeof tty === "string" ? tty : null };
}

async function searchRxNorm(query: string): Promise<QueryResult> {
  try {
    const url = new URL(`${RXNAV_BASE_URL}/approximateTerm.json`);
    url.searchParams.set("term", query);
    url.searchParams.set("maxEntries", String(MAX_CANDIDATES));
    const payload = await getJson(url);

    const group = isRecord(payload) && isRecord(payload.approximateGroup) ? payload.approximateGroup : null;
    const rawCandidates = group && Array.isArray(group.candidate) ? group.candidate : [];

    const matches = new Map<string, number | null>();
    for (const item of rawCandidates) {
      if (!isRecord(item) || typeof item.rxcui !== "string") continue;
      const score = typeof item.score === "string" ? Number(item.score) : null;
      if (!matches.has(item.rxcui)) {
        matches.set(item.rxcui, score !== null && Number.isFinite(score) ? score : null);
      }
    }

    const resolved = await Promise.all(
      Array.from(matches, async ([rxcui, score]) => {
        const details = await fetchName(rxcui);
        return details ? { rxcui, name: details.name, tty: details.tty, score } : null;
      }),
    );
    const candidates = resolved.filter((item): item is RxNormCandidate => item !== null);

    return {
      query,
      candidates,
      error: candidates.length === 0 ? "No RxNorm matches found." : null,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "RxNav search timed out."
        : error instanceof Error
          ? error.message
          : "RxNav search failed unexpectedly.";
    return { query, candidates: [], error: message };
  }
}

export async function POST(request: NextRequest) {
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
      { error: `Provide between 1 and ${MAX_QUERIES} drug names.` },
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
      { error: `Each drug name must contain 1 to ${MAX_QUERY_LENGTH} characters.` },
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

  const results: QueryResult[] = [];
  for (let start = 0; start < uniqueQueries.length; start += QUERY_BATCH_SIZE) {
    const batch = uniqueQueries.slice(start, start + QUERY_BATCH_SIZE);
    results.push(...(await Promise.all(batch.map(searchRxNorm))));
  }

  return NextResponse.json({
    results,
    failedCount: results.filter((result) => result.error).length,
    searchedCount: uniqueQueries.length,
  });
}
