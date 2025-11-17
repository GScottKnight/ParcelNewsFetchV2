import type { Stage1RelevanceResult } from "../models/types";
import { getPool } from "../db/postgres";

export class Stage1Repository {
  async upsertResult(rawArticleId: number, result: Stage1RelevanceResult): Promise<void> {
    const pool = getPool();
    await pool.query(
      `
      insert into stage1_results (raw_article_id, is_relevant, relevance_reason, carrier_mentions, is_cost_related, source_tier, confidence)
      values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (raw_article_id) do update set
        is_relevant = excluded.is_relevant,
        relevance_reason = excluded.relevance_reason,
        carrier_mentions = excluded.carrier_mentions,
        is_cost_related = excluded.is_cost_related,
        source_tier = excluded.source_tier,
        confidence = excluded.confidence
      `,
      [
        rawArticleId,
        result.is_relevant,
        result.relevance_reason,
        result.carrier_mentions,
        result.is_cost_related,
        result.source_tier,
        result.confidence,
      ],
    );
  }
}
