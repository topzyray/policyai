import { desc, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { AuthIdentity } from "@/lib/auth/identity";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function upsertUserProfile(identity: AuthIdentity) {
  const db = getDb();
  const [row] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      auth0Sub: identity.sub,
      email: identity.email ?? null,
      name: identity.name ?? null,
    })
    .onConflictDoUpdate({
      target: users.auth0Sub,
      set: {
        email: identity.email ?? null,
        name: identity.name ?? null,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return row;
}

export async function listProfilesBySub(subs: string[]) {
  if (subs.length === 0) return [];
  return getDb().select().from(users).where(inArray(users.auth0Sub, subs)).orderBy(desc(users.createdAt));
}

export async function findProfile(sub: string) {
  const [row] = await getDb().select().from(users).where(eq(users.auth0Sub, sub)).limit(1);
  return row ?? null;
}
