#!/usr/bin/env node
// Simple health check: DB connectivity and counts.
const { Pool } = require("pg");

const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL or NEON_DATABASE_URL is required");
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: url });
  try {
    const res = await pool.query("select 1 as ok");
    if (res.rows?.[0]?.ok !== 1) throw new Error("DB check failed");
    console.log("db_ok", true);
    const counts = await pool.query(
      "select count(*) as raw_count from raw_articles; select count(*) as stage1_count from stage1_results; select count(*) as stage2_count from stage2_extractions;",
    );
    console.log("counts", counts[0]?.rows || counts.rows || counts);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("health_check failed", err);
  process.exit(1);
});
