# Parcel News Pipeline

Scaffold aligned to the Parcel News Pipeline spec (see `Documents/parcel_news_pipeline_spec (1).md`). This repo is wired for Netlify deploys and a Node/TypeScript backend scaffold for the ingestion and LLM pipeline.

## Getting Started

```bash
npm install
npm run build
```

- Build outputs:
  - Static site placeholder to `dist/` for Netlify.
  - Compiled TypeScript to `dist/server/` for pipeline code.
- Ingestion poller (scaffold): `npm run dev` (after `npm run build`) — fetches Benzinga and placeholder Yahoo Finance.
- Article body fetch: enabled by default; set `FETCH_ARTICLE_BODY=false` to skip. Body fetch timeout via `ARTICLE_BODY_FETCH_TIMEOUT_MS` (default 8000ms).
- For a single poll run (useful in CI/tests), set `POLL_ONCE=true`.

## Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables: add the keys from `.env.example` (never commit `.env`).

## Structure
- `public/` — Simple landing page for the live site.
- `src/models/` — Enums/types that mirror the spec for Stage 1/Stage 2/CanonicalEvent.
- `src/utils/` — Helpers like normalized event signature builder.
- `src/index.ts` — Placeholder extraction object to verify typing and signature generation.
- `Documents/parcel_news_pipeline_spec (1).md` — Source spec.

## Next Steps (per plan)
1) Expand config/loading and schema validation for LLM outputs.
2) Add ingestion pollers (Benzinga/Alpaca) and persistence (Postgres/Neon).
3) Implement Stage 1 classifier + Stage 2 extractor using prompts from the spec.
4) Add event dedupe/merge logic and downstream calculator interface.
5) Add tests (schema validation, signature generation, lever merge rules) and observability.

## Environment
Copy `.env.example` to `.env` and fill with actual credentials. Keep `.env` out of git/Netlify UI; add keys via Netlify environment settings.
