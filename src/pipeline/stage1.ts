import type { RawNewsArticle } from "../types/news";
import type { Stage1RelevanceResult } from "../models/types";
import type { RawArticleRepository } from "../storage/rawArticleRepository";
import { logger } from "../logger";

// Placeholder classifier; replace with an actual model call.
async function classify(article: RawNewsArticle): Promise<Stage1RelevanceResult> {
  return {
    is_relevant: false,
    relevance_reason: "Placeholder classifier not implemented",
    carrier_mentions: [],
    is_cost_related: false,
    source_tier: article.sourceTier,
    confidence: 0.0,
  };
}

export async function runStage1(
  repo: RawArticleRepository,
  articles: RawNewsArticle[],
): Promise<void> {
  if (!articles.length) return;
  for (const article of articles) {
    try {
      await classify(article);
      await repo.markStatus([article], "processed");
    } catch (err) {
      logger.error("Stage1 classification failed", {
        source: article.source,
        url: article.url,
        error: (err as Error).message,
      });
      await repo.markStatus([article], "failed");
    }
  }
}
