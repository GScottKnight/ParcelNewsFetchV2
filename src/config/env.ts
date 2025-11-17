import dotenv from "dotenv";

dotenv.config();

export type AppConfig = {
  benzingaApiKey: string;
  benzingaNewsPageSize: number;
  newsPollIntervalSec: number;
  newsDisplayOutput: string | undefined;
};

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    benzingaApiKey: requireEnv("BENZINGA_API_KEY"),
    benzingaNewsPageSize: Number(process.env.NEWS_PAGE_SIZE ?? "50"),
    newsPollIntervalSec: Number(process.env.NEWS_POLL_INTERVAL_SEC ?? "60"),
    newsDisplayOutput: process.env.NEWS_DISPLAY_OUTPUT,
  };
}
