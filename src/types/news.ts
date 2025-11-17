import type { SourceTier } from "../models/enums";

export interface RawNewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO string
  updatedAt?: string; // ISO string
  sourceTier: SourceTier;
  tickers: string[];
  channels?: string[];
  body?: string;
  ingestionStatus?: "new" | "processed" | "failed";
}

export interface NewsFetchResult {
  source: string;
  articles: RawNewsArticle[];
  nextCursor?: string;
}
