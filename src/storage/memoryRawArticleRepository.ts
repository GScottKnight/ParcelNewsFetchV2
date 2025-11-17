import type { RawNewsArticle } from "../types/news";
import type { RawArticleRepository } from "./rawArticleRepository";
import { rawArticleKey } from "./rawArticleRepository";

export class InMemoryRawArticleRepository implements RawArticleRepository {
  private seen = new Set<string>();
  private status = new Map<string, "new" | "processed" | "failed">();

  async hasSeen(article: RawNewsArticle): Promise<boolean> {
    return this.seen.has(rawArticleKey(article));
  }

  async markSeen(articles: RawNewsArticle[]): Promise<void> {
    for (const article of articles) {
      this.seen.add(rawArticleKey(article));
      this.status.set(rawArticleKey(article), "new");
    }
  }

  async markStatus(
    articles: RawNewsArticle[],
    status: "new" | "processed" | "failed",
  ): Promise<void> {
    for (const article of articles) {
      const key = rawArticleKey(article);
      if (this.seen.has(key)) {
        this.status.set(key, status);
      }
    }
  }
}
