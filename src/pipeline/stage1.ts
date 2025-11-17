import type { RawNewsArticle } from "../types/news";
import type { Stage1RelevanceResult } from "../models/types";
import type { RawArticleRepository } from "../storage/rawArticleRepository";
import { logger } from "../logger";
import { loadConfig } from "../config/env";

const SYSTEM_PROMPT = `
You are a classifier for parcel-carrier cost-impact news.
Return a JSON object matching the Stage1RelevanceResult schema:
{
  "is_relevant": boolean,
  "relevance_reason": string,
  "carrier_mentions": ["UPS","FedEx","Other"],
  "is_cost_related": boolean,
  "source_tier": "carrier_official"|"major_news"|"industry_press"|"blog"|"other",
  "confidence": number between 0 and 1
}
Relevant if: mentions UPS/FedEx or parcel carriers AND relates to costs, surcharges, rates, fuel, DIM, peak, contracts, programs. Ignore general market/crypto/noise.
`.trim();

function buildUserMessage(article: RawNewsArticle, maxBodyChars: number): string {
  const body = (article.body || "").slice(0, maxBodyChars);
  return [
    `Title: ${article.title}`,
    `Source: ${article.source}`,
    `Published: ${article.publishedAt}`,
    `URL: ${article.url}`,
    `Tickers: ${article.tickers.join(", ")}`,
    `Channels: ${(article.channels || []).join(", ")}`,
    `Body: ${body}`,
  ].join("\n");
}

async function classifyWithLLM(article: RawNewsArticle): Promise<Stage1RelevanceResult> {
  const { openAiApiKey, stage1Model, stage1MaxBodyChars } = loadConfig();
  const payload = {
    model: stage1Model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(article, stage1MaxBodyChars) },
    ],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI Stage1 call failed: ${res.status} ${res.statusText} - ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI Stage1 returned no content");
  return JSON.parse(content) as Stage1RelevanceResult;
}

function classifyFallback(article: RawNewsArticle): Stage1RelevanceResult {
  const lowerTitle = article.title.toLowerCase();
  const lowerBody = (article.body || "").toLowerCase();
  const mentions = ["ups", "fedex", "fed ex"].filter(
    (c) => lowerTitle.includes(c) || lowerBody.includes(c),
  );
  const costKeywords = ["rate", "surcharge", "fuel", "dim", "peak", "contract", "gri", "pricing"];
  const costHit = costKeywords.some((k) => lowerTitle.includes(k) || lowerBody.includes(k));
  return {
    is_relevant: mentions.length > 0 && costHit,
    relevance_reason: mentions.length
      ? `Heuristic: mentions ${mentions.join(", ")} and cost keywords`
      : "Heuristic fallback; no carrier mention",
    carrier_mentions: mentions.length ? (mentions.includes("ups") ? ["UPS"] : ["FedEx"]) : [],
    is_cost_related: costHit,
    source_tier: article.sourceTier,
    confidence: mentions.length && costHit ? 0.4 : 0.1,
  };
}

export async function runStage1(
  repo: RawArticleRepository,
  articles: RawNewsArticle[],
  onResult?: (article: RawNewsArticle, result: Stage1RelevanceResult) => Promise<void>,
): Promise<void> {
  if (!articles.length) return;
  const { stage1DryRun, openAiApiKey } = loadConfig();
  for (const article of articles) {
    try {
      let result: Stage1RelevanceResult;
      if (stage1DryRun || !openAiApiKey) {
        result = classifyFallback(article);
      } else {
        result = await classifyWithLLM(article);
      }
      logger.info("Stage1 result", {
        source: article.source,
        url: article.url,
        is_relevant: result.is_relevant,
        confidence: result.confidence,
      });
      if (onResult) {
        await onResult(article, result);
      }
      await repo.markStatus([article], "processed");
    } catch (err) {
      logger.error("Stage1 classification failed", {
        source: article.source,
        url: article.url,
        error: (err as Error).message,
      });
      await repo.markStatus([article], "failed");
    }
  }
}
