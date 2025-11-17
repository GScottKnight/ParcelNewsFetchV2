import { loadConfig } from "../config/env";
import { logger } from "../logger";
import * as cheerio from "cheerio";

// Fetch article HTML and extract readable text from common containers. This is a heuristic fallback
// used because Benzinga API often omits full bodies even with display_output=full.
export async function fetchArticleContent(url: string): Promise<string | null> {
  const { articleBodyFetchTimeoutMs } = loadConfig();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), articleBodyFetchTimeoutMs);
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/html" } });
    clearTimeout(timeout);
    if (!res.ok) {
      logger.warn("Article fetch failed", { url, status: res.status });
      return null;
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    const candidates = [
      "article",
      '[itemprop="articleBody"]',
      ".article-body",
      ".article__body",
      ".article-content",
      "#articleBody",
      "main",
    ];

    for (const selector of candidates) {
      const el = $(selector);
      if (el.length) {
        const text = el.text().trim();
        if (text.length > 200) return normalizeWhitespace(text);
      }
    }

    // Fallback: collect paragraph text
    const paragraphs = $("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);
    if (paragraphs.length) {
      const text = paragraphs.join("\n\n");
      if (text.length > 200) return normalizeWhitespace(text);
    }

    return null;
  } catch (err) {
    logger.warn("Article fetch error", { url, error: (err as Error).message });
    return null;
  }
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r?\n\s*/g, "\n").replace(/[ \t]+/g, " ").trim();
}
