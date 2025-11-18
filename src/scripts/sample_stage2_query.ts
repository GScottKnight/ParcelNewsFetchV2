import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL or NEON_DATABASE_URL is required");
  const pool = new Pool({ connectionString: url });
  try {
    const res = await pool.query(
      `
      select ra.title, ra.url, s2.extraction->>'normalized_event_signature' as norm_sig
      from stage2_extractions s2
      join raw_articles ra on ra.id = s2.raw_article_id
      limit 5
    `,
    );
    console.log(res.rows);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
