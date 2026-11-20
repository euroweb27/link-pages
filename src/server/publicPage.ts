import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clicks, items, pageViews, pages } from "@/db/schema";
import { isLive } from "./rules";

/** A published page and what visitors may see of it, or null. */
export async function getPublishedPage(handle: string, now = new Date()) {
  const [page] = await db
    .select({
      id: pages.id,
      handle: pages.handle,
      name: pages.name,
      bio: pages.bio,
      avatarKey: pages.avatarKey,
      theme: pages.theme,
      buttons: pages.buttons,
      signupEnabled: pages.signupEnabled,
      signupHeading: pages.signupHeading,
      signupAskDetails: pages.signupAskDetails,
    })
    .from(pages)
    .where(and(eq(pages.handle, handle), eq(pages.published, true)));
  if (!page) return null;
  const rows = await db
    .select({
      id: items.id,
      kind: items.kind,
      title: items.title,
      featured: items.featured,
      enabled: items.enabled,
      startsAt: items.startsAt,
      endsAt: items.endsAt,
    })
    .from(items)
    .where(eq(items.pageId, page.id))
    .orderBy(asc(items.position), asc(items.id));
  const visible = rows
    .filter((row) => (row.kind === "header" ? row.enabled : isLive(row, now)))
    .map(({ id, kind, title, featured }) => ({ id, kind, title, featured }));
  return { ...page, items: visible };
}

export type PublicPage = NonNullable<Awaited<ReturnType<typeof getPublishedPage>>>;

/** The stored URL of a link visitors can see now on that published page, or null. */
export async function findLiveLink(handle: string, itemId: string, now = new Date()) {
  const [row] = await db
    .select({
      pageId: pages.id,
      url: items.url,
      kind: items.kind,
      enabled: items.enabled,
      startsAt: items.startsAt,
      endsAt: items.endsAt,
    })
    .from(items)
    .innerJoin(pages, eq(pages.id, items.pageId))
    .where(and(eq(items.id, itemId), eq(pages.handle, handle), eq(pages.published, true)));
  if (!row || row.kind !== "link" || !row.url || !isLive(row, now)) return null;
  return { pageId: row.pageId, url: row.url };
}

export async function recordView(pageId: string, source: string, country: string) {
  await db.insert(pageViews).values({
    id: crypto.randomUUID(),
    pageId,
    at: new Date().toISOString(),
    source,
    country,
  });
}

export async function recordClick(pageId: string, itemId: string, country: string) {
  await db.insert(clicks).values({
    id: crypto.randomUUID(),
    pageId,
    itemId,
    at: new Date().toISOString(),
    country,
  });
}

/** The avatar of a page a visitor may see, or the owner's own. */
export async function findAvatar(handle: string, viewerId: string | null) {
  const [page] = await db
    .select({
      key: pages.avatarKey,
      type: pages.avatarType,
      published: pages.published,
      userId: pages.userId,
    })
    .from(pages)
    .where(eq(pages.handle, handle));
  if (!page?.key || !page.type) return null;
  if (!page.published && page.userId !== viewerId) return null;
  return { key: page.key, type: page.type };
}

/** Where a visit came from: ?src= when given, else the referrer's host, else "direct". */
export function sourceOf(request: Request): string {
  const url = new URL(request.url);
  const tag = url.searchParams.get("src")?.trim().toLowerCase();
  if (tag) return tag.replace(/[^a-z0-9._-]/g, "").slice(0, 40) || "direct";
  const referrer = request.headers.get("referer");
  if (referrer) {
    try {
      const host = new URL(referrer).hostname.toLowerCase();
      if (host && host !== url.hostname) return host.slice(0, 100);
    } catch {
      // An unreadable referrer counts as direct.
    }
  }
  return "direct";
}

export function countryOf(request: Request): string {
  const cf = (request as Request & { cf?: { country?: unknown } }).cf;
  const country =
    (typeof cf?.country === "string" ? cf.country : null) ??
    request.headers.get("cf-ipcountry");
  return country && /^[A-Z]{2}$/.test(country) && country !== "XX" ? country : "Unknown";
}
