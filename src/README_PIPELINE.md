# Pipeline Scaffold (Ingestion Focus)

This document tracks the ingestion/poller scaffold aligned with the Parcel News Pipeline spec.

## Sources
- Benzinga (implemented): `src/clients/benzinga.ts`
- Yahoo Finance (placeholder): `src/clients/yahooFinance.ts`
- Additional sources can be added by implementing the `NewsFetchResult` shape in `src/types/news.ts` and registering the fetcher in `src/pipeline/poller.ts`.

## Poller
- `src/pipeline/poller.ts` orchestrates source fetches. It logs counts and will later persist raw articles and enqueue for Stage 1 relevance.
- Interval is driven by `NEWS_POLL_INTERVAL_SEC` (default 60s) via `src/config/env.ts`.

## Config
- `src/config/env.ts` loads environment variables and enforces required keys (Benzinga API key). Update as new sources are added.

## Next Steps
1) Persist raw articles (Postgres/Neon) with dedupe on URL/ID.
2) Add basic keyword/rules pre-filter before Stage 1 LLM calls.
3) Write Stage 1 classifier call + schema validation to `Stage1RelevanceResult`.
4) Expand source coverage (Yahoo Finance / others) and ticker/channel filtering.
