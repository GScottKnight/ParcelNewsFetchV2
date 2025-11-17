import type { NewsFetchResult, RawNewsArticle } from "../types/news";
import type { SourceTier } from "../models/enums";
import { logger } from "../logger";
import { loadConfig } from "../config/env";

// Benzinga news API docs: https://docs.benzinga.io/#!/News/get_news
// This scaffold fetches latest headlines; filtering/ticker targeting can be added via params.
const BENZINGA_BASE_URL = "https://api.benzinga.com/api/v2/news";

type BenzingaResponseItem = {
  id: number;
  title: string;
  url: string;
  created: string;
  updated: string;
  teaser?: string;
  body?: string;
  stocks?: string[];
  author?: string;
  source?: string;
};

function mapSourceToTier(source?: string): SourceTier {
  if (!source) return "other";
  const normalized = source.toLowerCase();
  if (normalized.includes("benzinga")) return "major_news";
  return "industry_press";
}

function mapToRawArticle(item: BenzingaResponseItem): RawNewsArticle {
  return {
    id: String(item.id),
    title: item.title,
    url: item.url,
    source: item.source ?? "Benzinga",
    publishedAt: item.updated || item.created,
    sourceTier: mapSourceToTier(item.source),
    tickers: item.stocks ?? [],
    body: item.body ?? item.teaser,
  };
}

export async function fetchBenzingaNews(params?: {
  page?: number;
  pageSize?: number;
  tickers?: string[];
  channels?: string[];
}): Promise<NewsFetchResult> {
  const { benzingaApiKey, benzingaNewsPageSize } = loadConfig();
  const page = params?.page ?? 0;
  const pageSize = params?.pageSize ?? benzingaNewsPageSize;

  const searchParams = new URLSearchParams({
    token: benzingaApiKey,
    page: String(page),
    pagesize: String(pageSize),
  });
  if (params?.tickers?.length) searchParams.append("tickers", params.tickers.join(","));
  if (params?.channels?.length) searchParams.append("channels", params.channels.join(","));

  const url = `${BENZINGA_BASE_URL}?${searchParams.toString()}`;
  logger.debug("Fetching Benzinga news", { url });

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Benzinga fetch failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = (await res.json()) as { data?: BenzingaResponseItem[] };
  const items = data.data ?? [];
  const articles = items.map(mapToRawArticle);

  return {
    source: "Benzinga",
    articles,
    nextCursor: items.length === pageSize ? String(page + 1) : undefined,
  };
}
