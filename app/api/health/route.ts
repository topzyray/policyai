import { isAuth0Configured } from "@/lib/auth0";
import { readLocalFgaStore } from "@/lib/fga/client";

export async function GET() {
  const local = await readLocalFgaStore();
  return Response.json({
    ok: true,
    services: {
      auth0: isAuth0Configured(),
      database: Boolean(process.env.DATABASE_URL),
      openai: Boolean(process.env.OPENAI_API_KEY),
      fga: Boolean((process.env.FGA_STORE_ID && process.env.FGA_MODEL_ID) || (local.storeId && local.authorizationModelId)),
    },
  });
}
