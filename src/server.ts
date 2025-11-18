import express, { Request, Response } from "express";
import path from "path";
import { getPool } from "./db/postgres";
import { logger } from "./logger";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    await pool.query("select 1");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.get("/api/canonical", async (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? "50");
  const since = req.query.since as string | undefined;
  const pool = getPool();
  try {
    const params: any[] = [limit];
    let where = "";
    if (since) {
      where = "where ce.updated_at >= $2";
      params.push(since);
    }
    const result = await pool.query(
      `
      select ce.id, ce.normalized_signature, ce.event, ce.updated_at,
             array_remove(array_agg(ces.source_url), null) as source_urls
      from canonical_events ce
      left join canonical_event_sources ces on ce.id = ces.canonical_event_id
      ${where}
      group by ce.id
      order by ce.updated_at desc
      limit $1
    `,
      params,
    );
    res.json(result.rows);
  } catch (err) {
    logger.error("canonical fetch failed", { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/stage2", async (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? "50");
  const pool = getPool();
  try {
    const result = await pool.query(
      `
      select s2.raw_article_id, ra.title, ra.url, s2.extraction, s2.normalized_signature, s2.updated_at
      from stage2_extractions s2
      join raw_articles ra on ra.id = s2.raw_article_id
      order by s2.updated_at desc
      limit $1
    `,
      [limit],
    );
    res.json(result.rows);
  } catch (err) {
    logger.error("stage2 fetch failed", { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/stage1_relevant", async (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? "50");
  const pool = getPool();
  try {
    const result = await pool.query(
      `
      select ra.id as raw_article_id, ra.title, ra.url, s1.relevance_reason, s1.confidence, s1.carrier_mentions
      from stage1_results s1
      join raw_articles ra on ra.id = s1.raw_article_id
      where s1.is_relevant = true
      order by ra.published_at desc
      limit $1
    `,
      [limit],
    );
    res.json(result.rows);
  } catch (err) {
    logger.error("stage1 relevant fetch failed", { error: (err as Error).message });
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/viewer", (_req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), "dist", "viewer.html"));
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`UI/API server listening on http://localhost:${port}`);
});
