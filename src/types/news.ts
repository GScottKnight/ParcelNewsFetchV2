import type { SourceTier } from "../models/enums";

export interface RawNewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO string
  sourceTier: SourceTier;
  tickers: string[];
  body?: string;
}

export interface NewsFetchResult {
  source: string;
  articles: RawNewsArticle[];
  nextCursor?: string;
}
