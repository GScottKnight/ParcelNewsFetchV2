import { getPool } from "../db/postgres";
import type { Stage2ArticleExtraction, CanonicalEvent } from "../models/types";
import { mergeLevers } from "../utils/leverMerge";

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

  async upsertCanonical(
    event: CanonicalEvent,
    extraction: Stage2ArticleExtraction,
    rawArticleId: number,
  ): Promise<void> {
    const pool = getPool();
    const existing = await pool.query(
      `select id, event from canonical_events where normalized_signature = $1`,
      [event.normalized_event_signature],
    );

    let canonicalId: number;
    if (existing.rowCount && existing.rows[0]) {
      const currentEvent = existing.rows[0].event as CanonicalEvent;
      const mergedLevers = mergeLevers(currentEvent.levers || [], extraction.levers || []);
      const updated: CanonicalEvent = {
        ...currentEvent,
        levers: mergedLevers,
        last_updated_at: new Date().toISOString(),
      };
      await pool.query(
        `update canonical_events set event = $1, updated_at = now() where normalized_signature = $2`,
        [updated, event.normalized_event_signature],
      );
      canonicalId = existing.rows[0].id as number;
    } else {
      const inserted = await pool.query(
        `
        insert into canonical_events (normalized_signature, event)
        values ($1, $2)
        returning id
      `,
        [event.normalized_event_signature, event],
      );
      canonicalId = inserted.rows[0].id as number;
    }

    await pool.query(
      `
      insert into canonical_event_sources
      (canonical_event_id, raw_article_id, source_url, source_name, source_tier, publication_date, used_for_levers)
      values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (canonical_event_id, raw_article_id) do nothing
    `,
      [
        canonicalId,
        rawArticleId,
        extraction.article_metadata.source_url,
        extraction.article_metadata.source_name,
        extraction.article_metadata.source_tier,
        extraction.article_metadata.publication_date,
        true,
      ],
    );
  }
}
