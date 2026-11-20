import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clicks, items, pageViews, pages } from "@/db/schema";

export const analyticsInput = z
  .object({ pageId: z.string().min(1), days: z.union([z.literal(7), z.literal(30)]) })
  .strict();

/** Views, clicks, sources and countries of one of the user's pages; null when not theirs. */
export async function getAnalytics(
  userId: string,
  { pageId, days }: z.infer<typeof analyticsInput>,
  now = new Date(),
) {
  const [page] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)));
  if (!page) return null;

  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const since = start.toISOString();
  const viewsIn = and(eq(pageViews.pageId, pageId), gte(pageViews.at, since));
  const clicksIn = and(eq(clicks.pageId, pageId), gte(clicks.at, since));
  const viewDay = sql<string>`substr(${pageViews.at}, 1, 10)`;
  const clickDay = sql<string>`substr(${clicks.at}, 1, 10)`;

  const [viewsByDay, clicksByDay, byLink, sources, countries] = await Promise.all([
    db.select({ day: viewDay, n: count() }).from(pageViews).where(viewsIn).groupBy(viewDay),
    db.select({ day: clickDay, n: count() }).from(clicks).where(clicksIn).groupBy(clickDay),
    db
      .select({ itemId: clicks.itemId, title: items.title, n: count() })
      .from(clicks)
      .innerJoin(items, eq(items.id, clicks.itemId))
      .where(clicksIn)
      .groupBy(clicks.itemId, items.title)
      .orderBy(desc(count()))
      .limit(50),
    db
      .select({ name: pageViews.source, n: count() })
      .from(pageViews)
      .where(viewsIn)
      .groupBy(pageViews.source)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ name: pageViews.country, n: count() })
      .from(pageViews)
      .where(viewsIn)
      .groupBy(pageViews.country)
      .orderBy(desc(count()))
      .limit(10),
  ]);

  const views = new Map(viewsByDay.map((row) => [row.day, row.n]));
  const clicked = new Map(clicksByDay.map((row) => [row.day, row.n]));
  const daily = Array.from({ length: days }, (_, offset) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + offset);
    const key = day.toISOString().slice(0, 10);
    return { day: key, views: views.get(key) ?? 0, clicks: clicked.get(key) ?? 0 };
  });
  const totalViews = daily.reduce((sum, row) => sum + row.views, 0);
  const totalClicks = daily.reduce((sum, row) => sum + row.clicks, 0);
  return {
    days,
    views: totalViews,
    clicks: totalClicks,
    ctr: totalViews === 0 ? 0 : totalClicks / totalViews,
    daily,
    byLink: byLink.map(({ itemId, title, n }) => ({ itemId, title, clicks: n })),
    sources: sources.map(({ name, n }) => ({ name, views: n })),
    countries: countries.map(({ name, n }) => ({ name, views: n })),
  };
}
