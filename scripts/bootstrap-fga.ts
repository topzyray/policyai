import "./load-env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { OpenFgaClient } from "@openfga/sdk";
import { createOpenFgaClient, fgaCredentials, readLocalFgaStore } from "@/lib/fga/client";
import { loadAuthorizationModel } from "@/lib/fga/model";
import { directoryTuples, writeTuples } from "@/lib/fga/tuples";

async function main() {
  const apiUrl = process.env.FGA_API_URL ?? (await readLocalFgaStore()).apiUrl ?? "http://127.0.0.1:8080";
  const credentials = fgaCredentials();
  const local = await readLocalFgaStore();
  let storeId = process.env.FGA_STORE_ID ?? local.storeId;

  if (!storeId) {
    const created = await new OpenFgaClient({ apiUrl, credentials }).createStore({ name: "policyai" });
    storeId = created.id;
    if (!storeId) throw new Error("Auth0 FGA did not return a store id");
  }

  const modelClient = createOpenFgaClient({ apiUrl, storeId, credentials });
  const written = await modelClient.writeAuthorizationModel(await loadAuthorizationModel());
  const authorizationModelId = written.authorization_model_id;
  if (!authorizationModelId) throw new Error("Auth0 FGA did not return a model id");

  const client = createOpenFgaClient({ apiUrl, storeId, authorizationModelId, credentials });
  const admins = [process.env.POLICYAI_ADMIN_SUB ?? ""].filter(Boolean);
  await writeTuples(client, directoryTuples(admins));

  const destination = path.join(process.cwd(), ".fga", "local.json");
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify({ apiUrl, storeId, authorizationModelId }, null, 2));

  console.log(`FGA store ${storeId}`);
  console.log(`FGA model ${authorizationModelId}`);
  if (admins.length === 0) {
    console.log("Set POLICYAI_ADMIN_SUB to your Auth0 subject and run this command again to grant admin.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
