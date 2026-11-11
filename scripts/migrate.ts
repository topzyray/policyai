import "./load-env";
import { migrateDatabase } from "@/lib/db/migrate";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }
  await migrateDatabase(connectionString);
  console.log("Database migrations applied.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
