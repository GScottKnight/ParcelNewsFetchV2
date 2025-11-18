import { getPool } from "../db/postgres";
import type { Stage2ArticleExtraction, CanonicalEvent } from "../models/types";

export class Stage2Repository {
  async insertExtraction(
    rawArticleId: number,
    extraction: Stage2ArticleExtraction,
  ): Promise<void> {
    const pool = getPool();
    await pool.query(
      `
      insert into stage2_extractions (raw_article_id, extraction, normalized_signature)
      values ($1, $2, $3)
      on conflict (raw_article_id) do update set
        extraction = excluded.extraction,
        normalized_signature = excluded.normalized_signature,
        updated_at = now()
    `,
      [rawArticleId, extraction, extraction.normalized_event_signature],
    );
  }

  async upsertCanonical(event: CanonicalEvent): Promise<void> {
    const pool = getPool();
    await pool.query(
      `
      insert into canonical_events (normalized_signature, event)
      values ($1, $2)
      on conflict (normalized_signature) do update set
        event = excluded.event,
        updated_at = now()
    `,
      [event.normalized_event_signature, event],
    );
  }
}
