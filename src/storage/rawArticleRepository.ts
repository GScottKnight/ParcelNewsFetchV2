import type { RawNewsArticle } from "../types/news";

export interface RawArticleRepository {
  hasSeen(article: RawNewsArticle): Promise<boolean>;
  markSeen(articles: RawNewsArticle[]): Promise<void>;
  markStatus(articles: RawNewsArticle[], status: "new" | "processed" | "failed"): Promise<void>;
}

// Generate a consistent key for deduping raw articles
export function rawArticleKey(article: RawNewsArticle): string {
  return `${article.source}::${article.url || article.id}`;
}
