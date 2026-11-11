import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

export async function migrateDatabase(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const directory = path.join(process.cwd(), "drizzle");
    const files = (await readdir(directory))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const applied = await client.query("SELECT 1 FROM schema_migrations WHERE id = $1", [file]);
      if (applied.rowCount) continue;
      const sql = await readFile(path.join(directory, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}
