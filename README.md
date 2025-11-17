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
- HTML scraping fallback can be disabled: set `FETCH_ARTICLE_BODY_SCRAPE=false` (default) to rely solely on API-provided bodies; set to `true` only if you want to scrape URLs when the API omits body.
- For a single poll run (useful in CI/tests), set `POLL_ONCE=true`.
- Persistence: if `DATABASE_URL` (or `NEON_DATABASE_URL`) is set, the poller uses Postgres with dedupe on `(source, url)`. Otherwise it falls back to in-memory for local smoke tests.
- Initialize DB schema: `set -a && source .env && node -e "require('fs'); const {Pool}=require('pg'); const sql=require('fs').readFileSync('scripts/schema.sql','utf8'); const pool=new Pool({connectionString:process.env.DATABASE_URL||process.env.NEON_DATABASE_URL}); pool.query(sql).then(()=>{console.log('schema applied'); pool.end();});"`
- Stage1 batching script: `set -a && source .env && STAGE1_BATCH_SIZE=50 STAGE1_MAX_MINUTES=20 scripts/run_stage1_batches.js` (rerun until `raw_articles` shows no `new`).
- Verify counts: `set -a && source .env && node -e "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL||process.env.NEON_DATABASE_URL});Promise.all([p.query('select ingestion_status,count(*) from raw_articles group by ingestion_status'), p.query('select is_relevant,count(*) from stage1_results group by is_relevant')]).then(([a,b])=>{console.log('raw',a.rows); console.log('stage1',b.rows); p.end();});"`

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
