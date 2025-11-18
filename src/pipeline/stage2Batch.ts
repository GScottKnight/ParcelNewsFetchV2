import { PostgresRawArticleRepository } from "../storage/postgresRawArticleRepository";
import { Stage2Repository } from "../storage/stage2Repository";
import { extractStage2, toCanonicalEvent } from "./stage2Extractor";
import { logger } from "../logger";
import type { RawArticleRepository } from "../storage/rawArticleRepository";

const DEFAULT_BATCH_SIZE = 10;

export async function processStage2Batches(
  rawRepo: RawArticleRepository,
  batchSize = DEFAULT_BATCH_SIZE,
  maxMinutes = 10,
): Promise<number> {
  if (!(rawRepo as PostgresRawArticleRepository).fetchRelevantForStage2) {
    logger.warn("Stage2 batching requires Postgres repository (fetchRelevantForStage2 not available).");
    return 0;
  }
  const fetcher = (rawRepo as PostgresRawArticleRepository).fetchRelevantForStage2!.bind(rawRepo);
  const stage2Repo = new Stage2Repository();
  const start = Date.now();
  let processed = 0;
  while (true) {
    const elapsedMin = (Date.now() - start) / 60000;
    if (elapsedMin >= maxMinutes) {
      logger.info("Stage2 batch exiting due to max minutes", { processed, maxMinutes });
      break;
    }
    const batch = await fetcher(batchSize);
    if (!batch.length) {
      logger.info("No Stage2 candidates found");
      break;
    }
    for (const item of batch) {
      try {
        const extraction = await extractStage2(item.article);
        await stage2Repo.insertExtraction(item.raw_article_id, extraction);
        const canonical = toCanonicalEvent(extraction);
        await stage2Repo.upsertCanonical(canonical);
        processed += 1;
        await rawRepo.markStatus([item.article], "processed");
        logger.info("Stage2 processed", {
          url: item.article.url,
          normalized_signature: extraction.normalized_event_signature,
        });
      } catch (err) {
        logger.error("Stage2 extraction failed", {
          url: item.article.url,
          error: (err as Error).message,
        });
        await rawRepo.markStatus([item.article], "failed");
      }
    }
  }
  logger.info("Stage2 batching complete", { processed });
  return processed;
}
