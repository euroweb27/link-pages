import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Records the person on first sight and keeps their email current. */
export async function rememberUser(user: { id: string; email: string }) {
  await db
    .insert(users)
    .values({ id: user.id, email: user.email })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: sql`excluded.email` },
    });
}
