import { and, asc, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { items, pages } from "@/db/schema";
import { InputError, httpUrl, scheduleFields } from "./rules";

const title = z.string().trim().min(1, "Give it a title.").max(120);

const itemFields = {
  title,
  url: httpUrl.optional(),
  featured: z.boolean().optional(),
  ...scheduleFields,
};

export const createItemInput = z
  .object({ pageId: z.string().min(1), kind: z.enum(["link", "header"]), ...itemFields })
  .strict();
export const updateItemInput = z
  .object({ itemId: z.string().min(1), ...itemFields })
  .strict();
export const itemIdInput = z.object({ itemId: z.string().min(1) }).strict();
export const setEnabledInput = z
  .object({ itemId: z.string().min(1), enabled: z.boolean() })
  .strict();
export const moveItemInput = z
  .object({ itemId: z.string().min(1), direction: z.enum(["up", "down"]) })
  .strict();

const shown = {
  id: items.id,
  kind: items.kind,
  title: items.title,
  url: items.url,
  featured: items.featured,
  enabled: items.enabled,
  startsAt: items.startsAt,
  endsAt: items.endsAt,
  position: items.position,
};

export type Item = Awaited<ReturnType<typeof listItems>>[number];

// Items are reached through their page, and the page through its owner.
function ownedPageIds(userId: string) {
  return db.select({ id: pages.id }).from(pages).where(eq(pages.userId, userId));
}

function ownedItem(userId: string, itemId: string) {
  return and(eq(items.id, itemId), inArray(items.pageId, ownedPageIds(userId)));
}

export function listItems(userId: string, pageId: string) {
  return db
    .select(shown)
    .from(items)
    .innerJoin(pages, eq(pages.id, items.pageId))
    .where(and(eq(items.pageId, pageId), eq(pages.userId, userId)))
    .orderBy(asc(items.position), asc(items.id));
}

function checkSchedule(startsAt?: string | null, endsAt?: string | null) {
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new InputError("The end must come after the start.");
  }
}

export async function createItem(
  userId: string,
  { pageId, kind, ...fields }: z.infer<typeof createItemInput>,
) {
  if (kind === "link" && !fields.url) {
    throw new InputError("Enter a web address starting with http:// or https://.");
  }
  checkSchedule(fields.startsAt, fields.endsAt);
  const [page] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)));
  if (!page) return null;
  const [last] = await db
    .select({ position: max(items.position) })
    .from(items)
    .where(eq(items.pageId, pageId));
  const link = kind === "link";
  const [item] = await db
    .insert(items)
    .values({
      id: crypto.randomUUID(),
      pageId,
      kind,
      position: (last?.position ?? -1) + 1,
      title: fields.title,
      url: link ? fields.url : null,
      featured: link ? (fields.featured ?? false) : false,
      startsAt: link ? (fields.startsAt ?? null) : null,
      endsAt: link ? (fields.endsAt ?? null) : null,
    })
    .returning(shown);
  return item!;
}

export async function updateItem(
  userId: string,
  { itemId, ...fields }: z.infer<typeof updateItemInput>,
) {
  checkSchedule(fields.startsAt, fields.endsAt);
  const [current] = await db.select(shown).from(items).where(ownedItem(userId, itemId));
  if (!current) return null;
  const link = current.kind === "link";
  if (link && !fields.url) {
    throw new InputError("Enter a web address starting with http:// or https://.");
  }
  const [item] = await db
    .update(items)
    .set({
      title: fields.title,
      url: link ? fields.url : null,
      featured: link ? (fields.featured ?? false) : false,
      startsAt: link ? (fields.startsAt ?? null) : null,
      endsAt: link ? (fields.endsAt ?? null) : null,
    })
    .where(ownedItem(userId, itemId))
    .returning(shown);
  return item ?? null;
}

export async function setItemEnabled(
  userId: string,
  { itemId, enabled }: z.infer<typeof setEnabledInput>,
) {
  const [item] = await db
    .update(items)
    .set({ enabled })
    .where(ownedItem(userId, itemId))
    .returning(shown);
  return item ?? null;
}

export async function deleteItem(userId: string, { itemId }: z.infer<typeof itemIdInput>) {
  const [item] = await db
    .delete(items)
    .where(ownedItem(userId, itemId))
    .returning(shown);
  return item ?? null;
}

/** Swaps the item with its neighbour; null when the item isn't the user's. */
export async function moveItem(
  userId: string,
  { itemId, direction }: z.infer<typeof moveItemInput>,
) {
  const [item] = await db
    .select({ id: items.id, pageId: items.pageId })
    .from(items)
    .where(ownedItem(userId, itemId));
  if (!item) return null;
  const list = await listItems(userId, item.pageId);
  const at = list.findIndex((entry) => entry.id === itemId);
  const other = direction === "up" ? at - 1 : at + 1;
  if (at < 0 || other < 0 || other >= list.length) return list[at] ?? null;
  // Renumber the whole page in one batch, so positions stay distinct.
  const order = list.map((entry) => entry.id);
  [order[at], order[other]] = [order[other]!, order[at]!];
  const [first, ...rest] = order.map((id, position) =>
    db.update(items).set({ position }).where(and(eq(items.id, id), eq(items.pageId, item.pageId))),
  );
  await db.batch([first!, ...rest]);
  return list[at]!;
}
