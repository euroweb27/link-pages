import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { callTool, listTools } from "@every-app/sdk/testing";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const testDb = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { tools } = await import("./tools");

beforeAll(async () => {
  const db = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  });
  testDb.current = db;
});

describe("tools", () => {
  it("lists each tool with its risk", async () => {
    const { tools: listed } = await listTools(tools);
    expect(listed.map(({ name, risk }) => [name, risk])).toEqual([
      ["add_link", "write"],
      ["list_items", "read"],
      ["list_pages", "read"],
    ]);
  });

  it("acts for the person calling, and only on their pages", async () => {
    const ana = await callTool(tools, "list_pages", {}, { user: { id: "ana" } });
    expect(ana).toMatchObject({ result: { content: [{ text: "[]" }] } });
    const refused = await callTool(
      tools,
      "add_link",
      { pageId: "someone-elses", title: "Nope", url: "https://example.com" },
      { user: { id: "bo" } },
    );
    expect(JSON.stringify(refused)).toContain("No page with that id");
  });
});
