#!/usr/bin/env node
// Lists canonical events, optionally since a given ISO timestamp.
const { Pool } = require("pg");

const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL or NEON_DATABASE_URL is required");
  process.exit(1);
}

const since = process.env.SINCE; // ISO date string

async function main() {
  const pool = new Pool({ connectionString: url });
  const params = [];
  let where = "";
  if (since) {
    where = "where updated_at >= $1";
    params.push(since);
  }
  const res = await pool.query(
    `
    select normalized_signature, event, updated_at
    from canonical_events
    ${where}
    order by updated_at desc
    limit 50
  `,
    params,
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

main().catch((err) => {
  console.error("list_canonical_events failed", err);
  process.exit(1);
});
