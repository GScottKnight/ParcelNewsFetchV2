import { fetchBenzingaNews } from "../clients/benzinga";
import { fetchYahooFinanceNews } from "../clients/yahooFinance";
import { logger } from "../logger";
import { loadConfig } from "../config/env";
import type { RawNewsArticle } from "../types/news";
import type { RawArticleRepository } from "../storage/rawArticleRepository";
import { fetchArticleContent } from "../content/fetchArticleContent";

type SourceFetcher = () => Promise<{ source: string; articles: RawNewsArticle[] }>;

const sources: SourceFetcher[] = [fetchBenzingaNews, fetchYahooFinanceNews];

export async function runPollOnce(rawRepo: RawArticleRepository): Promise<void> {
  logger.info("Starting news poll");
  const { fetchArticleBody } = loadConfig();
  for (const fetcher of sources) {
    try {
      const result = await fetcher();
      const deduped = await dedupeNewArticles(rawRepo, result.articles);
      logger.info(`Fetched ${result.articles.length} articles`, { source: result.source });
      logger.info(`New articles after dedupe: ${deduped.length}`, { source: result.source });
      if (fetchArticleBody && deduped.length) {
        const withBody = await hydrateBodies(deduped);
        logger.info(`Articles with body fetched: ${withBody}`, { source: result.source });
      }
      // TODO: Persist deduped raw articles (with body when available) and enqueue for Stage 1 relevance.
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

async function hydrateBodies(articles: RawNewsArticle[]): Promise<number> {
  let withBody = 0;
  for (const article of articles) {
    if (article.body && article.body.trim().length > 0) {
      withBody += 1;
      continue;
    }
    const text = await fetchArticleContent(article.url);
    if (text) {
      article.body = text;
      withBody += 1;
    }
  }
  return withBody;
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
