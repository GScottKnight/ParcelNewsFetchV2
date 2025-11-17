import { fetchBenzingaNews } from "../clients/benzinga";
import { fetchYahooFinanceNews } from "../clients/yahooFinance";
import { logger } from "../logger";
import { loadConfig } from "../config/env";
import type { RawNewsArticle } from "../types/news";

type SourceFetcher = () => Promise<{ source: string; articles: RawNewsArticle[] }>;

const sources: SourceFetcher[] = [fetchBenzingaNews, fetchYahooFinanceNews];

export async function runPollOnce(): Promise<void> {
  logger.info("Starting news poll");
  for (const fetcher of sources) {
    try {
      const result = await fetcher();
      logger.info(`Fetched ${result.articles.length} articles`, { source: result.source });
      // TODO: Persist raw articles to storage and enqueue for Stage 1 relevance.
    } catch (err) {
      logger.error("Source fetch failed", { error: (err as Error).message });
    }
  }
}

export async function startPolling(): Promise<void> {
  const { newsPollIntervalSec } = loadConfig();
  await runPollOnce();
  setInterval(runPollOnce, newsPollIntervalSec * 1000);
}
