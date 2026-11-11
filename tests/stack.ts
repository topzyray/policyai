import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "pg";
import { OpenFgaClient } from "@openfga/sdk";
import { loadAuthorizationModel } from "@/lib/fga/model";

const exec = promisify(execFile);
export const FGA_URL = process.env.FGA_API_URL ?? "http://127.0.0.1:8080";
export const APP_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://policyai:policyai@127.0.0.1:54329/policyai_test";
const ADMIN_DATABASE_URL = "postgres://policyai:policyai@127.0.0.1:54329/policyai";

async function reachable(url: string) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function postgresReady() {
  const client = new Client({ connectionString: ADMIN_DATABASE_URL });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function ensureDemoStack() {
  if ((await reachable(`${FGA_URL}/healthz`)) && (await postgresReady())) return;

  await exec("docker", ["compose", "up", "-d"], { cwd: process.cwd() });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if ((await reachable(`${FGA_URL}/healthz`)) && (await postgresReady())) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Postgres or OpenFGA did not become ready. Check docker compose logs.");
}

export async function createTestFga() {
  await ensureDemoStack();
  const root = new OpenFgaClient({ apiUrl: FGA_URL });
  const created = await root.createStore({ name: `policyai-test-${Date.now()}` });
  if (!created.id) throw new Error("OpenFGA did not return a store id");
  const model = await loadAuthorizationModel();
  const writer = new OpenFgaClient({ apiUrl: FGA_URL, storeId: created.id });
  const written = await writer.writeAuthorizationModel(model);
  if (!written.authorization_model_id) throw new Error("OpenFGA did not return a model id");
  return new OpenFgaClient({
    apiUrl: FGA_URL,
    storeId: created.id,
    authorizationModelId: written.authorization_model_id,
  });
}

export async function prepareTestDatabase() {
  await ensureDemoStack();
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'policyai_test'");
  if (existing.rowCount === 0) await admin.query("CREATE DATABASE policyai_test");
  await admin.end();

  const { migrateDatabase } = await import("@/lib/db/migrate");
  await migrateDatabase(APP_DATABASE_URL);
  process.env.DATABASE_URL = APP_DATABASE_URL;
}
