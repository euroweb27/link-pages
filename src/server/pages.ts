import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pages, users } from "@/db/schema";
import { InputError, handleSchema } from "./rules";

export const createPageInput = z
  .object({
    handle: handleSchema,
    name: z.string().trim().min(1, "Give the page a name.").max(80),
  })
  .strict();

export const updateProfileInput = z
  .object({
    pageId: z.string().min(1),
    handle: handleSchema,
    name: z.string().trim().min(1, "Give the page a name.").max(80),
    bio: z.string().trim().max(300, "Keep the bio under 300 characters."),
    theme: z.enum(["light", "dark"]),
    buttons: z.enum(["rounded", "square"]),
  })
  .strict();

export const signupSettingsInput = z
  .object({
    pageId: z.string().min(1),
    enabled: z.boolean(),
    heading: z.string().trim().max(120),
    askDetails: z.boolean(),
  })
  .strict();

export const pageIdInput = z.object({ pageId: z.string().min(1) }).strict();
export const setPublishedInput = z
  .object({ pageId: z.string().min(1), published: z.boolean() })
  .strict();

const summary = {
  id: pages.id,
  handle: pages.handle,
  name: pages.name,
  published: pages.published,
};

const full = {
  ...summary,
  bio: pages.bio,
  avatarKey: pages.avatarKey,
  theme: pages.theme,
  buttons: pages.buttons,
  signupEnabled: pages.signupEnabled,
  signupHeading: pages.signupHeading,
  signupAskDetails: pages.signupAskDetails,
};

export type PageDetail = Awaited<ReturnType<typeof getPage>> & {};

export function listPages(userId: string) {
  return db
    .select(summary)
    .from(pages)
    .where(eq(pages.userId, userId))
    .orderBy(asc(pages.createdAt), asc(pages.id));
}

/** The page when this user owns it, else null. */
export async function getPage(userId: string, pageId: string) {
  const [page] = await db
    .select(full)
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)));
  return page ?? null;
}

async function handleTaken(handle: string, exceptPageId?: string) {
  const [row] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.handle, handle));
  return Boolean(row && row.id !== exceptPageId);
}

export async function createPage(
  userId: string,
  input: z.infer<typeof createPageInput>,
) {
  if (await handleTaken(input.handle)) {
    throw new InputError("That handle is taken.");
  }
  try {
    const [page] = await db
      .insert(pages)
      .values({ id: crypto.randomUUID(), userId, ...input })
      .returning(summary);
    return page!;
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      throw new InputError("That handle is taken.");
    }
    throw error;
  }
}

export async function updateProfile(
  userId: string,
  { pageId, ...change }: z.infer<typeof updateProfileInput>,
) {
  if (await handleTaken(change.handle, pageId)) {
    throw new InputError("That handle is taken.");
  }
  const [page] = await db
    .update(pages)
    .set(change)
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)))
    .returning(summary);
  return page ?? null;
}

export async function setPublished(
  userId: string,
  { pageId, published }: z.infer<typeof setPublishedInput>,
) {
  const [page] = await db
    .update(pages)
    .set({ published })
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)))
    .returning(summary);
  return page ?? null;
}

export async function updateSignupSettings(
  userId: string,
  { pageId, enabled, heading, askDetails }: z.infer<typeof signupSettingsInput>,
) {
  const [page] = await db
    .update(pages)
    .set({
      signupEnabled: enabled,
      signupHeading: heading,
      signupAskDetails: askDetails,
    })
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)))
    .returning(summary);
  return page ?? null;
}

/** Points the page at a new picture; returns the old key to delete, or null when not the owner's page. */
export async function setAvatar(
  userId: string,
  pageId: string,
  avatar: { key: string; type: string } | null,
) {
  const page = await getPage(userId, pageId);
  if (!page) return null;
  await db
    .update(pages)
    .set({ avatarKey: avatar?.key ?? null, avatarType: avatar?.type ?? null })
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)));
  return { previous: page.avatarKey };
}

export async function deletePage(userId: string, pageId: string) {
  const [page] = await db
    .delete(pages)
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)))
    .returning({ id: pages.id, avatarKey: pages.avatarKey });
  return page ?? null;
}

// Admins only: the server functions check isAdmin before calling these.
export function listAllPages() {
  return db
    .select({ ...summary, ownerEmail: users.email })
    .from(pages)
    .leftJoin(users, eq(users.id, pages.userId))
    .orderBy(desc(pages.createdAt), asc(pages.id));
}

export async function unpublishAny(pageId: string) {
  const [page] = await db
    .update(pages)
    .set({ published: false })
    .where(eq(pages.id, pageId))
    .returning(summary);
  return page ?? null;
}
