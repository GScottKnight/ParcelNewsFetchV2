import type { RawArticleRepository } from "../storage/rawArticleRepository";
import type { Stage1RelevanceResult } from "../models/types";
import { PostgresRawArticleRepository } from "../storage/postgresRawArticleRepository";
import { Stage1Repository } from "../storage/stage1Repository";
import { runStage1 } from "./stage1";
import { logger } from "../logger";

const DEFAULT_BATCH_SIZE = 50;

export async function processStage1Batches(
  repo: RawArticleRepository,
  batchSize = DEFAULT_BATCH_SIZE,
  singleBatchOnly = false,
): Promise<number> {
  if (!(repo as PostgresRawArticleRepository).fetchUnprocessed) {
    logger.warn("Stage1 batching skipped: repository does not support fetchUnprocessed");
    return 0;
  }
  const fetcher = (repo as PostgresRawArticleRepository).fetchUnprocessed!.bind(repo);
  const stage1Repo = new Stage1Repository();
  let processed = 0;
  while (true) {
    const batch = await fetcher(batchSize);
    if (!batch.length) break;
    const articles = batch.map((b) => b.article);
    const idMap = new Map<string, number>();
    batch.forEach((b) => idMap.set(b.article.url, b.dbId));
    await runStage1(repo, articles, async (article, result: Stage1RelevanceResult) => {
      const id = idMap.get(article.url);
      if (id) await stage1Repo.upsertResult(id, result);
    });
    processed += batch.length;
    logger.info("Stage1 batch processed", { batchSize: batch.length, totalProcessed: processed });
    if (singleBatchOnly) break;
  }
  logger.info("Stage1 batching complete", { totalProcessed: processed });
  return processed;
}
