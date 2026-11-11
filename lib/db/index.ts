import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";
import { HttpError } from "@/lib/http";

export type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { pool?: Pool };

export function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new HttpError(503, "database_not_configured");
  return url;
}

export function getPool() {
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({ connectionString: databaseUrl() });
  }
  return globalForDb.pool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export async function closePool() {
  if (globalForDb.pool) {
    await globalForDb.pool.end();
    globalForDb.pool = undefined;
  }
}
