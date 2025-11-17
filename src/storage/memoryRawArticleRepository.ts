import type { RawNewsArticle } from "../types/news";
import type { RawArticleRepository } from "./rawArticleRepository";
import { rawArticleKey } from "./rawArticleRepository";

export class InMemoryRawArticleRepository implements RawArticleRepository {
  private seen = new Set<string>();

  async hasSeen(article: RawNewsArticle): Promise<boolean> {
    return this.seen.has(rawArticleKey(article));
  }

  async markSeen(articles: RawNewsArticle[]): Promise<void> {
    for (const article of articles) {
      this.seen.add(rawArticleKey(article));
    }
  }
}
