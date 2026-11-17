// The app's Postgres connection, from DATABASE_URL (a platform-config key: the PgBouncer URL of this environment's
// database, role `<db>_app`). Absent in local development: callers then fall back to their in-memory store.
import { getSecret } from "astro:env/server";
import postgres, { type Sql } from "postgres";

let cached: { url: string; sql: Sql } | null = null;

/**
 * The shared connection, created on first use and reused while the URL stays the same, or null without
 * DATABASE_URL. `prepare: false` is required behind PgBouncer in transaction mode; a Lambda container runs one
 * request at a time, so one connection is enough. The URL's `sslmode=require` turns TLS on.
 */
export function getDb(read: (key: string) => string | undefined = (key) => getSecret(key)): Sql | null {
  const url = read("DATABASE_URL")?.trim();
  if (!url) return null;
  if (cached?.url !== url) {
    void cached?.sql.end({ timeout: 1 }).catch(() => {});
    cached = { url, sql: postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 }) };
  }
  return cached.sql;
}
