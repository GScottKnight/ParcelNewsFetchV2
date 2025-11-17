import dotenv from "dotenv";

dotenv.config();

export type AppConfig = {
  benzingaApiKey: string;
  benzingaNewsPageSize: number;
  newsPollIntervalSec: number;
  newsDisplayOutput: string | undefined;
  fetchArticleBody: boolean;
  fetchArticleBodyScrape: boolean;
  articleBodyFetchTimeoutMs: number;
};

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    benzingaApiKey: requireEnv("BENZINGA_API_KEY"),
    benzingaNewsPageSize: Number(process.env.NEWS_PAGE_SIZE ?? "50"),
    newsPollIntervalSec: Number(process.env.NEWS_POLL_INTERVAL_SEC ?? "60"),
    newsDisplayOutput: process.env.NEWS_DISPLAY_OUTPUT ?? "full",
    fetchArticleBody: process.env.FETCH_ARTICLE_BODY !== "false",
    fetchArticleBodyScrape: process.env.FETCH_ARTICLE_BODY_SCRAPE === "true",
    articleBodyFetchTimeoutMs: Number(process.env.ARTICLE_BODY_FETCH_TIMEOUT_MS ?? "8000"),
  };
}
