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
- Entered LOINC codes and displays are not automatically checked and are not saved.
- The CSV and mapping values stay in the browser; they are not sent to an API or database.

Use synthetic data only. This demo has no authentication, persistent storage, or PHI safeguards and is not suitable for real patient data.

## Deploy to Vercel

1. Push this project to a GitHub repository. Do not include `.env.local`; it is ignored by Git.
2. In Vercel, choose **Add New → Project** and import the GitHub repository.
3. Keep the detected Next.js framework and default build settings (`npm run build`).
4. Deploy. The CSV preview page does not need a database environment variable.
5. Open the deployed URL and try the synthetic sample first.

Vercel deployments from GitHub are rebuilt when you push changes. Do not add credentials or real patient files to the repository.

## Existing database starter code

The project still contains a Drizzle/Neon starter schema and `/api/users` route. They are not used by the TermMap demo page. To use that separate endpoint, configure `DATABASE_URL` in your local environment and Vercel project, then apply the matching database migrations. The current demo does not save imported CSVs or mapping decisions to Neon.

## Why this is a review demo

The pasted deployment notes propose a public LOINC search endpoint and calculate confidence from result counts. This project does not treat either as verified terminology validation: a suggested code needs human review against an authoritative source. A future server-backed release should first define authentication, tenant isolation, data retention, and an approved terminology integration.
