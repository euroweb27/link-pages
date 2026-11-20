import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

// An in-memory SQLite with the app's migrations stands in for D1.
const testDb = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const pages = await import("./pages");
const items = await import("./items");
const signups = await import("./signups");
const publicPage = await import("./publicPage");
const analytics = await import("./analytics");
const { handleSchema, isLive } = await import("./rules");

beforeAll(async () => {
  const db = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
  });
  testDb.current = db;
});

describe("handles", () => {
  it("follow the format and skip reserved words", () => {
    expect(handleSchema.safeParse("maya-ceramics").success).toBe(true);
    for (const bad of ["ab", "a".repeat(31), "Upper", "with space", "admin", "api"]) {
      expect(handleSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("schedules", () => {
  it("hide a link outside its window", () => {
    const now = new Date("2026-05-01T12:00:00Z");
    expect(isLive({ enabled: true, startsAt: null, endsAt: null }, now)).toBe(true);
    expect(isLive({ enabled: false, startsAt: null, endsAt: null }, now)).toBe(false);
    expect(isLive({ enabled: true, startsAt: "2026-05-02T00:00:00Z", endsAt: null }, now)).toBe(false);
    expect(isLive({ enabled: true, startsAt: null, endsAt: "2026-05-01T11:00:00Z" }, now)).toBe(false);
  });
});

describe("ownership", () => {
  it("keeps one member's pages, items and sign-ups from another", async () => {
    const page = await pages.createPage("alice", { handle: "alice-page", name: "Alice" });
    await expect(pages.createPage("bob", { handle: "alice-page", name: "Bob" })).rejects.toThrow("taken");
    const link = (await items.createItem("alice", { pageId: page.id, kind: "link", title: "Shop", url: "https://example.com" }))!;

    expect(await pages.listPages("bob")).toEqual([]);
    expect(await pages.getPage("bob", page.id)).toBeNull();
    expect(await items.listItems("bob", page.id)).toEqual([]);
    expect(await items.createItem("bob", { pageId: page.id, kind: "link", title: "X", url: "https://x.example" })).toBeNull();
    expect(await items.setItemEnabled("bob", { itemId: link.id, enabled: false })).toBeNull();
    expect(await items.updateItem("bob", { itemId: link.id, title: "Hacked", url: "https://evil.example" })).toBeNull();
    expect(await items.moveItem("bob", { itemId: link.id, direction: "up" })).toBeNull();
    expect(await items.deleteItem("bob", { itemId: link.id })).toBeNull();
    expect(await pages.setPublished("bob", { pageId: page.id, published: true })).toBeNull();
    expect(await analytics.getAnalytics("bob", { pageId: page.id, days: 7 })).toBeNull();

    await pages.setPublished("alice", { pageId: page.id, published: true });
    await pages.updateSignupSettings("alice", { pageId: page.id, enabled: true, heading: "", askDetails: false });
    await signups.saveSignup({ id: page.id, signupAskDetails: false }, { email: "fan@example.com" });
    await signups.saveSignup({ id: page.id, signupAskDetails: false }, { email: "fan@example.com" });
    expect(await signups.listSignups("alice", { pageId: page.id })).toHaveLength(1);
    expect(await signups.listSignups("bob", { pageId: page.id })).toEqual([]);
    const [row] = await signups.listSignups("alice", { pageId: page.id });
    expect(await signups.deleteSignup("bob", { signupId: row!.id })).toBeNull();
    expect(await items.listItems("alice", page.id)).toHaveLength(1);
  });
});

describe("public page", () => {
  it("shows only live items and redirects only to them", async () => {
    const page = await pages.createPage("carol", { handle: "carol-page", name: "Carol" });
    const on = (await items.createItem("carol", { pageId: page.id, kind: "link", title: "On", url: "https://on.example" }))!;
    const off = (await items.createItem("carol", { pageId: page.id, kind: "link", title: "Off", url: "https://off.example" }))!;
    const later = (await items.createItem("carol", { pageId: page.id, kind: "link", title: "Later", url: "https://later.example", startsAt: "2099-01-01T00:00:00.000Z" }))!;
    await items.setItemEnabled("carol", { itemId: off.id, enabled: false });
    expect(await publicPage.getPublishedPage("carol-page")).toBeNull();
    await pages.setPublished("carol", { pageId: page.id, published: true });
    const shown = await publicPage.getPublishedPage("carol-page");
    expect(shown?.items.map((item) => item.title)).toEqual(["On"]);
    expect(await publicPage.findLiveLink("carol-page", on.id)).toMatchObject({ url: "https://on.example" });
    expect(await publicPage.findLiveLink("carol-page", off.id)).toBeNull();
    expect(await publicPage.findLiveLink("carol-page", later.id)).toBeNull();
    expect(await publicPage.findLiveLink("alice-page", on.id)).toBeNull();
    await items.moveItem("carol", { itemId: later.id, direction: "up" });
    expect((await items.listItems("carol", page.id)).map((item) => item.title)).toEqual(["On", "Later", "Off"]);

    await publicPage.recordView(page.id, "qr", "PT");
    await publicPage.recordClick(page.id, on.id, "PT");
    const stats = await analytics.getAnalytics("carol", { pageId: page.id, days: 7 });
    expect(stats).toMatchObject({ views: 1, clicks: 1, ctr: 1 });
    expect(stats?.sources).toEqual([{ name: "qr", views: 1 }]);
    expect(stats?.byLink).toEqual([{ itemId: on.id, title: "On", clicks: 1 }]);
  });
});
