import { Pool } from "pg";
import { logger } from "../logger";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL or NEON_DATABASE_URL is required for Postgres access");
  }
  pool = new Pool({ connectionString, max: 5 });
  pool.on("error", (err: Error) => logger.error("Unexpected Postgres error", { error: err.message }));
  return pool;
}
