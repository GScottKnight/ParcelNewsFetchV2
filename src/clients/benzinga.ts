import type { NewsFetchResult, RawNewsArticle } from "../types/news";
import type { SourceTier } from "../models/enums";
import { logger } from "../logger";
import { loadConfig } from "../config/env";
import { XMLParser } from "fast-xml-parser";

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
  channels?: { item?: { name?: string }[] } | { name?: string }[];
};

function mapSourceToTier(source?: string): SourceTier {
  if (!source) return "other";
  const normalized = source.toLowerCase();
  if (normalized.includes("benzinga")) return "major_news";
  return "industry_press";
}

function normalizeTickers(stocks?: BenzingaResponseItem["stocks"] | Record<string, unknown>): string[] {
  if (!stocks) return [];
  if (Array.isArray(stocks)) {
    // JSON format
    return (stocks as unknown[]).map((s) => (typeof s === "string" ? s : "")).filter(Boolean);
  }
  const items = (stocks as any).item ?? [];
  const arr = Array.isArray(items) ? items : [items];
  return arr
    .map((s) => {
      if (typeof s === "string") return s;
      if (s?.name) return String(s.name);
      return "";
    })
    .filter(Boolean);
}

function mapToRawArticle(item: BenzingaResponseItem): RawNewsArticle {
  return {
    id: String(item.id),
    title: item.title,
    url: item.url,
    source: item.source ?? "Benzinga",
    publishedAt: item.updated || item.created,
    sourceTier: mapSourceToTier(item.source),
    tickers: normalizeTickers(item.stocks as any),
    body: item.body ?? item.teaser,
  };
}

export async function fetchBenzingaNews(params?: {
  page?: number;
  pageSize?: number;
  tickers?: string[];
  channels?: string[];
}): Promise<NewsFetchResult> {
  const { benzingaApiKey, benzingaNewsPageSize, newsDisplayOutput } = loadConfig();
  const page = params?.page ?? 0;
  const pageSize = params?.pageSize ?? benzingaNewsPageSize;

  const searchParams = new URLSearchParams({
    token: benzingaApiKey,
    page: String(page),
    pagesize: String(pageSize),
    format: "json",
    display_output: newsDisplayOutput || "full",
  });
  if (params?.tickers?.length) searchParams.append("tickers", params.tickers.join(","));
  if (params?.channels?.length) searchParams.append("channels", params.channels.join(","));

  const url = `${BENZINGA_BASE_URL}?${searchParams.toString()}`;
  logger.debug("Fetching Benzinga news", { url });

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Benzinga fetch failed: ${res.status} ${res.statusText} - ${text}`);
  }

  if (!contentType.includes("application/json")) {
    const text = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(text);
    const items = parsed?.result?.item ?? [];
    const itemArray: BenzingaResponseItem[] = Array.isArray(items) ? items : [items].filter(Boolean);
    const articles = itemArray.map(mapToRawArticle);
    return {
      source: "Benzinga",
      articles,
      nextCursor: itemArray.length === pageSize ? String(page + 1) : undefined,
    };
  }

  const data = (await res.json()) as { data?: BenzingaResponseItem[] } | BenzingaResponseItem[];
  const itemsArray = Array.isArray(data) ? data : data.data ?? [];
  const articles = itemsArray.map(mapToRawArticle);

  return {
    source: "Benzinga",
    articles,
    nextCursor: itemsArray.length === pageSize ? String(page + 1) : undefined,
  };
}
