import type { RawNewsArticle } from "../types/news";
import type { Stage2ArticleExtraction, CanonicalEvent } from "../models/types";
import { loadConfig } from "../config/env";
import { logger } from "../logger";
import { buildNormalizedEventSignature } from "../utils/eventSignature";
import { mergeLevers } from "../utils/leverMerge";

const STAGE2_SYSTEM_PROMPT = `
Extract structured event data for parcel-carrier cost impacts.
Return a JSON object matching Stage2ArticleExtraction:
{
  "article_metadata": {
    "title": string,
    "source_url": string,
    "source_name": string,
    "publication_date": string (ISO),
    "source_tier": "carrier_official"|"major_news"|"industry_press"|"blog"|"other"
  },
  "event_summary": {
    "carrier": ["UPS"|"FedEx"|"Other"],
    "event_type": "...",
    "short_description": string,
    "announcement_date": string|null,
    "effective_date": string|null,
    "geographic_scope": "US"|"EU"|"Global"|"SpecificCountries"|"Unknown",
    "countries": [],
    "impact_direction_overall": "increase"|"decrease"|"mixed"|"unclear",
    "details_available": boolean,
    "details_confidence": number
  },
  "levers": [...],
  "event_signature_fields": {
    "carrier": "...",
    "primary_component": "...",
    "event_type": "...",
    "effective_date": string|null,
    "geographic_scope": "US"|"EU"|"Global"|"SpecificCountries"|"Unknown"
  },
  "normalized_event_signature": string,
  "extraction_confidence_overall": number,
  "notes": string
}
`.trim();

function buildUserContent(article: RawNewsArticle, maxBodyChars: number): string {
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

function makeFallbackExtraction(article: RawNewsArticle): Stage2ArticleExtraction {
  const signatureFields = {
    carrier: "Other" as const,
    primary_component: "Other" as const,
    event_type: "other" as const,
    effective_date: null,
    geographic_scope: "Unknown" as const,
  };
  const normalized = buildNormalizedEventSignature(signatureFields);
  return {
    article_metadata: {
      title: article.title,
      source_url: article.url,
      source_name: article.source,
      publication_date: article.publishedAt,
      source_tier: article.sourceTier,
    },
    event_summary: {
      carrier: ["Other"],
      event_type: "other",
      short_description: "Fallback extraction; classifier marked relevant but no details provided.",
      announcement_date: null,
      effective_date: null,
      geographic_scope: "Unknown",
      countries: [],
      impact_direction_overall: "unclear",
      details_available: false,
      details_confidence: 0,
    },
    levers: [],
    event_signature_fields: signatureFields,
    normalized_event_signature: normalized,
    extraction_confidence_overall: 0,
    notes: "Fallback extraction; replace with LLM output.",
  };
}

export async function extractStage2(article: RawNewsArticle): Promise<Stage2ArticleExtraction> {
  const { stage2DryRun, openAiApiKey, stage2Model, stage2MaxBodyChars } = loadConfig();
  if (stage2DryRun || !openAiApiKey) {
    logger.warn("Stage2 dry run or missing API key; returning fallback extraction", {
      url: article.url,
    });
    return makeFallbackExtraction(article);
  }

  const payload = {
    model: stage2Model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: STAGE2_SYSTEM_PROMPT },
      { role: "user", content: buildUserContent(article, stage2MaxBodyChars) },
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
    throw new Error(`OpenAI Stage2 call failed: ${res.status} ${res.statusText} - ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI Stage2 returned no content");
  const extraction = JSON.parse(content) as Stage2ArticleExtraction;
  // Ensure normalized signature is present
  if (!extraction.normalized_event_signature && extraction.event_signature_fields) {
    extraction.normalized_event_signature = buildNormalizedEventSignature(
      extraction.event_signature_fields,
    );
  }
  return extraction;
}

export function toCanonicalEvent(extraction: Stage2ArticleExtraction): CanonicalEvent {
  return {
    event_id: `evt_${extraction.normalized_event_signature}`,
    normalized_event_signature: extraction.normalized_event_signature,
    carrier: extraction.event_signature_fields.carrier,
    event_type: extraction.event_signature_fields.event_type,
    primary_component: extraction.event_signature_fields.primary_component,
    short_description: extraction.event_summary.short_description,
    announcement_date: extraction.event_summary.announcement_date,
    effective_date: extraction.event_summary.effective_date,
    geographic_scope: extraction.event_summary.geographic_scope,
    countries: extraction.event_summary.countries,
    levers: extraction.levers,
    source_articles: [], // can be populated when linking back
    confidence_overall: extraction.extraction_confidence_overall ?? 0,
    created_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
  };
}
