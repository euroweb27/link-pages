import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pages, signups } from "@/db/schema";

export const signupPost = z.object({
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address."),
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
});

export const listSignupsInput = z
  .object({ pageId: z.string().min(1), search: z.string().trim().max(100).optional() })
  .strict();
export const deleteSignupInput = z.object({ signupId: z.string().min(1) }).strict();

/** Stores a visitor's sign-up on a published page with the form on; a repeat email updates. */
export async function saveSignup(
  page: { id: string; signupAskDetails: boolean },
  input: z.infer<typeof signupPost>,
) {
  const name = page.signupAskDetails ? input.name || null : null;
  const phone = page.signupAskDetails ? input.phone || null : null;
  await db
    .insert(signups)
    .values({ id: crypto.randomUUID(), pageId: page.id, email: input.email, name, phone })
    .onConflictDoUpdate({
      target: [signups.pageId, signups.email],
      set: {
        name: sql`coalesce(excluded.name, ${signups.name})`,
        phone: sql`coalesce(excluded.phone, ${signups.phone})`,
        updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
      },
    });
}

const shown = {
  id: signups.id,
  email: signups.email,
  name: signups.name,
  phone: signups.phone,
  createdAt: signups.createdAt,
  updatedAt: signups.updatedAt,
};

export function listSignups(userId: string, { pageId, search }: z.infer<typeof listSignupsInput>) {
  const term = search ? `%${search.replace(/[%_\\]/g, (c) => `\\${c}`)}%` : null;
  return db
    .select(shown)
    .from(signups)
    .innerJoin(pages, eq(pages.id, signups.pageId))
    .where(
      and(
        eq(signups.pageId, pageId),
        eq(pages.userId, userId),
        term
          ? or(
              sql`${signups.email} like ${term} escape '\\'`,
              sql`${signups.name} like ${term} escape '\\'`,
            )
          : undefined,
      ),
    )
    .orderBy(desc(signups.updatedAt), desc(signups.id));
}

export async function deleteSignup(userId: string, { signupId }: z.infer<typeof deleteSignupInput>) {
  const owned = db.select({ id: pages.id }).from(pages).where(eq(pages.userId, userId));
  const [row] = await db
    .delete(signups)
    .where(and(eq(signups.id, signupId), inArray(signups.pageId, owned)))
    .returning({ id: signups.id });
  return row ?? null;
}

function csvCell(value: string | null): string {
  let text = value ?? "";
  // Spreadsheet apps run cells that start with these as formulas.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function signupsCsv(rows: Awaited<ReturnType<typeof listSignups>>): string {
  const lines = [["email", "name", "phone", "signed_up_at"].join(",")];
  for (const row of rows) {
    lines.push([row.email, row.name, row.phone, row.updatedAt].map(csvCell).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}
