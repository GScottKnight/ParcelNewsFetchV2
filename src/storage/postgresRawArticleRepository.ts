import type { RawNewsArticle } from "../types/news";
import type { RawArticleRepository } from "./rawArticleRepository";
import { rawArticleKey } from "./rawArticleRepository";
import { getPool } from "../db/postgres";

export class PostgresRawArticleRepository implements RawArticleRepository {
  async hasSeen(article: RawNewsArticle): Promise<boolean> {
    const pool = getPool();
    const res = await pool.query(
      "select 1 from raw_articles where source = $1 and (url = $2 or external_id = $3) limit 1",
      [article.source, article.url, article.id],
    );
    return Boolean(res.rowCount && res.rowCount > 0);
  }

  async markSeen(articles: RawNewsArticle[]): Promise<void> {
    if (!articles.length) return;
    const pool = getPool();
    const values: any[] = [];
    const placeholders: string[] = [];
    articles.forEach((a, idx) => {
      const base = idx * 9;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`,
      );
      values.push(
        a.id,
        a.source,
        a.url,
        a.title,
        a.publishedAt,
        a.updatedAt ?? a.publishedAt,
        JSON.stringify(a.tickers ?? []),
        JSON.stringify(a.channels ?? []),
        a.body ?? null,
      );
    });

    const sql = `
      insert into raw_articles
      (external_id, source, url, title, published_at, updated_at, tickers, channels, body)
      values ${placeholders.join(", ")}
      on conflict (source, url) do nothing
    `;
    await pool.query(sql, values);
  }

  // Utility to allow testing of dedupe keys
  makeKey(article: RawNewsArticle): string {
    return rawArticleKey(article);
  }
}
