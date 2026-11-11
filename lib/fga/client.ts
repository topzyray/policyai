import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  CredentialsMethod,
  OpenFgaClient,
  type UserClientConfigurationParams,
} from "@openfga/sdk";
import { HttpError } from "@/lib/http";

const globalForFga = globalThis as unknown as { client?: OpenFgaClient };

export function fgaCredentials(): UserClientConfigurationParams["credentials"] {
  const clientId = process.env.FGA_CLIENT_ID ?? process.env.FGA_API_CLIENT_ID;
  const clientSecret = process.env.FGA_CLIENT_SECRET ?? process.env.FGA_API_CLIENT_SECRET;
  if (!clientId || !clientSecret) return undefined;
  return {
    method: CredentialsMethod.ClientCredentials,
    config: {
      apiTokenIssuer: process.env.FGA_API_TOKEN_ISSUER ?? "auth.fga.dev",
      apiAudience: process.env.FGA_API_AUDIENCE ?? "https://api.us1.fga.dev/",
      clientId,
      clientSecret,
    },
  };
}

export async function readLocalFgaStore() {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), ".fga", "local.json"), "utf8")) as {
      storeId?: string;
      authorizationModelId?: string;
      apiUrl?: string;
    };
  } catch {
    return {};
  }
}

export async function resolveFgaSettings(): Promise<UserClientConfigurationParams> {
  const local = await readLocalFgaStore();
  return {
    apiUrl: process.env.FGA_API_URL ?? local.apiUrl ?? "http://127.0.0.1:8080",
    storeId: process.env.FGA_STORE_ID ?? local.storeId,
    authorizationModelId: process.env.FGA_MODEL_ID ?? local.authorizationModelId,
    credentials: fgaCredentials(),
  };
}

export function createOpenFgaClient(settings: UserClientConfigurationParams) {
  return new OpenFgaClient(settings);
}

export async function getFgaClient() {
  if (!globalForFga.client) {
    const settings = await resolveFgaSettings();
    if (!settings.storeId || !settings.authorizationModelId) {
      throw new HttpError(503, "fga_not_configured");
    }
    globalForFga.client = createOpenFgaClient(settings);
  }
  return globalForFga.client;
}

export function resetFgaClient() {
  globalForFga.client = undefined;
}
