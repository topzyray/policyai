import { Auth0Client } from "@auth0/nextjs-auth0/server";

let client: Auth0Client | null = null;

export function isAuth0Configured() {
  return Boolean(
    process.env.AUTH0_DOMAIN &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET &&
      process.env.AUTH0_SECRET &&
      process.env.APP_BASE_URL,
  );
}

export function getAuth0Client() {
  if (!isAuth0Configured()) return null;
  if (!client) client = new Auth0Client();
  return client;
}
