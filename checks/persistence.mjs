// What members and visitors write survives a restart.
import { startRuntime } from "/home/user/oss-new/control/runtime/index.mjs";
import { addItem, createPage, expect, setPublished } from "./lib.mjs";

const runtime = await startRuntime();
try {
  const owner = await (await runtime.context("owner")).newPage();
  const pageId = await createPage(owner, { handle: "north-trail-club", name: "North Trail Club" });
  await addItem(owner, { title: "Saturday group hike", url: "https://hike.example.com/saturday", featured: true });
  await setPublished(owner, true);
  await owner.getByTestId("tab-signups").click();
  await owner.getByTestId("signup-enabled").click();
  await owner.getByTestId("signup-save").click();
  await expect(owner.getByTestId("signup-saved")).toBeVisible();
  const posted = await runtime.fetch("/p/north-trail-club/signup", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "hiker@example.com" }),
  });
  expect(posted.status).toBe(200);
  expect((await runtime.fetch("/p/north-trail-club?src=poster")).status).toBe(200);

  await runtime.restart();

  const html = await (await runtime.fetch("/p/north-trail-club")).text();
  expect(html).toContain("Saturday group hike");
  const again = await (await runtime.context("owner")).newPage();
  await again.goto(`/pages/${pageId}`);
  await expect(again.getByTestId("item-row")).toContainText(["Saturday group hike"]);
  await expect(again.getByTestId("published-switch")).toHaveAttribute("aria-checked", "true");
  await again.goto(`/pages/${pageId}/signups`);
  await expect(again.getByTestId("signup-row")).toContainText(["hiker@example.com"]);
  await again.goto(`/pages/${pageId}/analytics`);
  await expect(again.getByTestId("top-sources")).toContainText("poster");
  console.log("persistence: ok");
} finally {
  await runtime.close();
}
