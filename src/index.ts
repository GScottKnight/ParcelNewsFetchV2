import { startPolling } from "./pipeline/poller";
import { logger } from "./logger";
import { InMemoryRawArticleRepository } from "./storage/memoryRawArticleRepository";

// Entry point for ingestion poller. This will fetch from Benzinga (and other sources as added)
// and later feed the Stage 1/Stage 2 pipeline.
const rawRepo = new InMemoryRawArticleRepository();

startPolling(rawRepo).catch((err) => {
  logger.error("Polling failed to start", { error: (err as Error).message });
  process.exit(1);
});
