import type { NewsFetchResult } from "../types/news";

// Placeholder for Yahoo Finance fetcher. Implement when API/source is finalized.
export async function fetchYahooFinanceNews(): Promise<NewsFetchResult> {
  return { source: "YahooFinance", articles: [] };
}
