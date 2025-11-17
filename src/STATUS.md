# Current Processing Status (for resuming later)

## Ingestion Window
- Benzinga articles ingested: ~72 hours (Fri 14 Nov 2025 15:17 ET to Mon 17 Nov 2025 15:18 ET)
- Raw articles in DB: 1,170

## Stage 1 Classification
- Processed: 429
- Remaining (ingestion_status = 'new'): 741
- Stage1 results stored: 429 total (428 not relevant, 1 relevant)

## How to Continue Processing
1) Ensure `.env` is loaded (has DB + OpenAI keys).
2) Run Stage1 batches until no `new` articles remain:
   ```bash
   set -a && source .env
   STAGE1_BATCH_SIZE=50 STAGE1_MAX_MINUTES=20 scripts/run_stage1_batches.js
   # repeat as needed
   ```
3) Check counts:
   ```bash
   set -a && source .env && node -e "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL||process.env.NEON_DATABASE_URL});Promise.all([p.query('select ingestion_status,count(*) from raw_articles group by ingestion_status'), p.query('select is_relevant,count(*) from stage1_results group by is_relevant')]).then(([a,b])=>{console.log('raw',a.rows); console.log('stage1',b.rows); p.end();});"
   ```

## Relevant Hits
- Currently 1 relevant article detected by Stage1 (details in `stage1_results`). Stage2 not run yet.

## Notes
- Stage1 uses OpenAI if `STAGE1_DRY_RUN=false` and `OPENAI_API_KEY` is set; batches persist results to `stage1_results` and update `raw_articles.ingestion_status` to `processed`.
- Schema applied via `scripts/schema.sql`; `raw_articles` deduped on (source, url); `stage1_results` unique per raw_article_id.
- Stage1 batching script: `scripts/run_stage1_batches.js` (uses env vars above).

## Next Steps After Stage1 Completes
- Export relevant articles and begin Stage2 extraction using the spec's schema.
- Add filters/alerts for carrier-specific (UPS/FedEx) signals if needed.
