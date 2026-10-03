# TermMap demo

A small Next.js demo for previewing lab-result CSV files, explicitly mapping columns, and recording human-reviewed LOINC choices.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page starts with synthetic sample rows. Choose a CSV to preview it in the browser.

### CSV preview limits

- CSV only; maximum 5 MB and 500 data records.
- Choose the test-name, result-value, and unit columns yourself.
- Each row keeps a CSV data-record reference during the current browser session.
- Only distinct test-name values are sent to LOINC when you press **Search LOINC**; result values and units stay in the browser.
- Up to five search candidates are shown for each distinct test name. Choose a candidate per row and verify its clinical fit; a search result is not a confirmed mapping.
- **Rank with Gemini** sends distinct test names and those LOINC candidate details to Google Gemini. It marks a recommendation and provides a rationale but never selects a code.
- Selected LOINC codes and displays are not saved.

Use synthetic data only. This demo has no authentication, persistent storage, or PHI safeguards and is not suitable for real patient data.

### Configure LOINC search

The LOINC Search API requires a LOINC account and HTTP Basic authentication. Register at [loinc.org/join](https://loinc.org/join), then put your credentials in the ignored `.env.local` file for local development:

```dotenv
LOINC_USERNAME=your_loinc_username
LOINC_PASSWORD=your_loinc_password
```

Never commit `.env.local` or send the password in chat. The API credentials stay on the local server; the browser calls the app's `/api/loinc/search` route. Without configured credentials, search returns an explicit setup error. Search is disabled in production because the app does not yet have user authentication; do not add these credentials to Vercel until authenticated access is implemented.

### Configure Gemini candidate ranking

Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey), then add it to the ignored `.env.local` file:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

The browser never receives the key. When you press **Rank with Gemini**, the local server sends up to 100 unique test names and their LOINC candidate codes, displays, and lab properties to Google. The CSV, patient identifiers, result values, and units are not included. Ranking is advisory, may be wrong, and does not replace terminology review. Check Google's current API terms and data handling before sending any sensitive information. This unauthenticated demo disables Gemini ranking in production.

## Deploy to Vercel

1. Push this project to a GitHub repository. Do not include `.env.local`; it is ignored by Git.
2. In Vercel, choose **Add New → Project** and import the GitHub repository.
3. Keep the detected Next.js framework and default build settings (`npm run build`).
4. Deploy. The CSV preview page does not need a database environment variable.
5. Open the deployed URL and try the synthetic sample first. LOINC search and Gemini ranking are intentionally disabled in production until the app has authenticated access.

Vercel deployments from GitHub are rebuilt when you push changes. Do not add credentials or real patient files to the repository.

## Existing database starter code

The project still contains a Drizzle/Neon starter schema and `/api/users` route. They are not used by the TermMap demo page. To use that separate endpoint, configure `DATABASE_URL` in your local environment and Vercel project, then apply the matching database migrations. The current demo does not save imported CSVs or mapping decisions to Neon.

## Why this is a review demo

The LOINC Search API is an authenticated pilot service. This app does not calculate confidence or auto-assign the first search result: a suggested code needs human review against an authoritative source. A future server-backed release should first define user authentication, tenant isolation, data retention, and an approved terminology integration.
