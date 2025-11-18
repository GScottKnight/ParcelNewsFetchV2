#!/usr/bin/env node
const { Pool } = require("pg");

const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL or NEON_DATABASE_URL is required");
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: url });
  try {
    const [raw, stage1, stage2, canonical] = await Promise.all([
      pool.query("select ingestion_status, count(*) from raw_articles group by ingestion_status"),
      pool.query("select is_relevant, count(*) from stage1_results group by is_relevant"),
      pool.query("select count(*) from stage2_extractions"),
      pool.query("select count(*) from canonical_events"),
    ]);
    console.log("raw", raw.rows);
    console.log("stage1", stage1.rows);
    console.log("stage2_extractions", stage2.rows);
    console.log("canonical_events", canonical.rows);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("check_counts failed", err);
  process.exit(1);
});
