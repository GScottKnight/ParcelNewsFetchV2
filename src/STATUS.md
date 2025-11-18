# Current Processing Status (for resuming later)

## Ingestion Window
- Benzinga articles ingested: ~72 hours (Fri 14 Nov 2025 15:17 ET to Mon 17 Nov 2025 15:18 ET)
- Raw articles in DB: 1,170

## Stage 1 Classification
- Processed: 1,170 (all)
- Remaining (ingestion_status = 'new'): 0
- Stage1 results stored: 1,170 total (1,165 not relevant, 5 relevant)

## How to Continue Processing
1) Ensure `.env` is loaded (has DB + OpenAI keys).
2) Stage2 candidates: 5 relevant articles (from Stage1 results) remain; run Stage2 batches:
   ```bash
   set -a && source .env
   STAGE2_BATCH_SIZE=5 STAGE2_MAX_MINUTES=5 node -e "const {processStage2Batches}=require('./dist/server/pipeline/stage2Batch'); const {makeRawRepo}=require('./dist/server/pipeline/poller'); (async()=>{await processStage2Batches(makeRawRepo(), 5, 5);})();"
   ```
3) Check counts:
   ```bash
   set -a && source .env && node -e "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL||process.env.NEON_DATABASE_URL});Promise.all([p.query('select ingestion_status,count(*) from raw_articles group by ingestion_status'), p.query('select is_relevant,count(*) from stage1_results group by is_relevant'), p.query('select count(*) from stage2_extractions'), p.query('select count(*) from canonical_events')]).then(([a,b,c,d])=>{console.log('raw',a.rows); console.log('stage1',b.rows); console.log('stage2_extractions',c.rows); console.log('canonical_events',d.rows); p.end();});"
   ```
4) List canonical events (optional):
   ```bash
   set -a && source .env
   SINCE=2025-11-15T00:00:00Z node scripts/list_canonical_events.js
   ```
5) Viewer/API (local):
   - Start: `HOST=127.0.0.1 PORT=3000 npm run serve` then open `http://localhost:3000/viewer`.
   - If ports are blocked locally, use scripts instead:
     - `node scripts/check_counts.js`
     - `node scripts/list_canonical_events.js`
     - `node dist/server/scripts/sample_stage2_query.js`

## Relevant Hits
- 5 relevant articles detected by Stage1 (details in `stage1_results`). Stage2 has processed these in current smoke run (see canonical_events/stage2_extractions).

## Notes
- Stage1 uses OpenAI if `STAGE1_DRY_RUN=false` and `OPENAI_API_KEY` is set; batches persist results to `stage1_results` and update `raw_articles.ingestion_status` to `processed`.
- Stage2 uses OpenAI if `STAGE2_DRY_RUN=false`; outputs go to `stage2_extractions` and upsert into `canonical_events`.
- Schema applied via `scripts/schema.sql`; `raw_articles` deduped on (source, url); `stage1_results` unique per raw_article_id; `stage2_extractions` unique per raw_article_id; `canonical_events` unique on normalized_signature.
- Stage1 batching script: `scripts/run_stage1_batches.js`; Stage2 batch runner is invoked directly via `processStage2Batches` (see command above).
 - Viewer/API served via `npm run serve` (uses Express on HOST/PORT); if not available, rely on the inspection scripts noted above.

## Next Steps After Stage1 Completes
- Export relevant articles and begin Stage2 extraction using the spec's schema.
- Add filters/alerts for carrier-specific (UPS/FedEx) signals if needed.
