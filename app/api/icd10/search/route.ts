import { NextRequest, NextResponse } from "next/server";

const ICD10CM_URL = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search";
const MAX_TERM_LENGTH = 100;
const MAX_RESULTS = 10;

type Icd10Candidate = { code: string; name: string };

export async function GET(request: NextRequest) {
  const terms = request.nextUrl.searchParams.get("terms")?.trim() ?? "";
  if (!terms || terms.length > MAX_TERM_LENGTH) {
    return NextResponse.json(
      { error: `Provide a code or search term of 1 to ${MAX_TERM_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const url = new URL(ICD10CM_URL);
  url.searchParams.set("sf", "code,name");
  url.searchParams.set("terms", terms);
  url.searchParams.set("maxList", String(MAX_RESULTS));

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: `ICD-10-CM lookup failed with HTTP ${response.status}.` },
        { status: 502 },
      );
    }

    const payload: unknown = await response.json();
    const rows = Array.isArray(payload) && Array.isArray(payload[3]) ? payload[3] : [];
    const candidates: Icd10Candidate[] = rows.flatMap((row: unknown) =>
      Array.isArray(row) && typeof row[0] === "string" && typeof row[1] === "string"
        ? [{ code: row[0], name: row[1] }]
        : [],
    );

    return NextResponse.json({ candidates });
  } catch {
    return NextResponse.json({ error: "ICD-10-CM lookup failed. Try again." }, { status: 502 });
  }
}
