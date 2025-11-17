import { fetchBenzingaNews } from "../clients/benzinga";
import { fetchYahooFinanceNews } from "../clients/yahooFinance";
import { logger } from "../logger";
import { loadConfig } from "../config/env";
import type { RawNewsArticle } from "../types/news";
import type { RawArticleRepository } from "../storage/rawArticleRepository";
import { PostgresRawArticleRepository } from "../storage/postgresRawArticleRepository";
import { InMemoryRawArticleRepository } from "../storage/memoryRawArticleRepository";
import { fetchArticleContent } from "../content/fetchArticleContent";
import { runStage1 } from "./stage1";

type SourceFetcher = (context: FetchContext) => Promise<{ source: string; articles: RawNewsArticle[] }>;

type FetchContext = {
  benzingaUpdatedSince?: number; // unix seconds
};

let benzingaLastUpdatedMs: number | undefined;

const sources: SourceFetcher[] = [
  async (ctx) => fetchBenzingaNews({ updatedSince: ctx.benzingaUpdatedSince }),
  async () => fetchYahooFinanceNews(),
];

export async function runPollOnce(rawRepo: RawArticleRepository): Promise<void> {
  logger.info("Starting news poll");
  const { fetchArticleBody, fetchArticleBodyScrape } = loadConfig();
  const updatedSince = benzingaLastUpdatedMs ? Math.floor((benzingaLastUpdatedMs - 5000) / 1000) : undefined;
  const context: FetchContext = { benzingaUpdatedSince: updatedSince };
  for (const fetcher of sources) {
    try {
      const result = await fetcher(context);
      const deduped = await dedupeNewArticles(rawRepo, result.articles);
      logger.info(`Fetched ${result.articles.length} articles`, { source: result.source });
      logger.info(`New articles after dedupe: ${deduped.length}`, { source: result.source });
      if (fetchArticleBody && deduped.length) {
        const withBody = await hydrateBodies(deduped, fetchArticleBodyScrape);
        logger.info(
          `Articles with body present (API or scraped): ${withBody}`,
          { source: result.source, scraped: fetchArticleBodyScrape },
        );
      }
      await runStage1(rawRepo, deduped);
      if (result.source === "Benzinga") {
        const maxUpdated = getMaxUpdatedMs(deduped);
        if (maxUpdated) benzingaLastUpdatedMs = maxUpdated;
      }
    } catch (err) {
      logger.error("Source fetch failed", { error: (err as Error).message });
    }
  }
}

async function dedupeNewArticles(
  rawRepo: RawArticleRepository,
  articles: RawNewsArticle[],
): Promise<RawNewsArticle[]> {
  const fresh: RawNewsArticle[] = [];
  for (const article of articles) {
    const seen = await rawRepo.hasSeen(article);
    if (!seen) {
      fresh.push(article);
    }
  }
  await rawRepo.markSeen(fresh);
  return fresh;
}

async function hydrateBodies(articles: RawNewsArticle[], allowScrape: boolean): Promise<number> {
  let withBody = 0;
  for (const article of articles) {
    if (article.body && article.body.trim().length > 0) {
      withBody += 1;
      continue;
    }
    if (allowScrape) {
      const text = await fetchArticleContent(article.url);
      if (text) {
        article.body = text;
        withBody += 1;
      }
    }
  }
  return withBody;
}

function getMaxUpdatedMs(articles: RawNewsArticle[]): number | undefined {
  let max = benzingaLastUpdatedMs ?? 0;
  for (const article of articles) {
    const ts = Date.parse(article.updatedAt || article.publishedAt);
    if (!Number.isNaN(ts) && ts > max) {
      max = ts;
    }
  }
  return max || undefined;
}

export async function startPolling(rawRepo: RawArticleRepository): Promise<void> {
  const { newsPollIntervalSec } = loadConfig();
  const singleRun = process.env.POLL_ONCE === "true";
  await runPollOnce(rawRepo);
  if (!singleRun) {
    setInterval(() => {
      void runPollOnce(rawRepo);
    }, newsPollIntervalSec * 1000);
  }
}

export function makeRawRepo(): RawArticleRepository {
  const hasDb = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (hasDb) return new PostgresRawArticleRepository();
  return new InMemoryRawArticleRepository();
}
