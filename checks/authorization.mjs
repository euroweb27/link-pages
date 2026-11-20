// Who may do what: private paths, public routes that show only what they
// should, members kept apart, admin-only actions, and no sign-in of the app's own.
import { startRuntime } from "/home/user/oss-new/control/runtime/index.mjs";
import { addItem, createPage, expect, publicLinkIds, setPublished } from "./lib.mjs";

const runtime = await startRuntime();
try {
  await runtime.assertPrivateAccess(["/", "/admin"]);

  // Two members, one page each.
  const owner = await (await runtime.context("owner")).newPage();
  const ownerPageId = await createPage(owner, { handle: "harbor-books", name: "Harbor Books" });
  await addItem(owner, { title: "Events calendar", url: "https://books.example.com/events" });
  await setPublished(owner, true);

  const member = await (await runtime.context("member")).newPage();
  const memberPageId = await createPage(member, { handle: "luis-runs", name: "Luis Runs" });
  await addItem(member, { title: "Training plan", url: "https://run.example.com/plan" });
  await setPublished(member, true);

  // Handles are unique across the install.
  await member.goto("/");
  await member.getByTestId("new-page").click();
  await member.getByTestId("page-handle").fill("harbor-books");
  await member.getByTestId("page-name").fill("Copycat");
  await member.getByTestId("create-page-submit").click();
  await expect(member.getByTestId("form-error")).toBeVisible();
  await member.keyboard.press("Escape");

  // Each member lists only their own pages.
  await member.goto("/");
  await expect(member.getByTestId("page-row")).toHaveText([/luis-runs/]);
  await owner.goto("/");
  await expect(owner.getByTestId("page-row")).toHaveText([/harbor-books/]);

  // Another member's page is not found in any part of the editor.
  for (const part of ["", "/profile", "/signups", "/analytics", "/qr"]) {
    await member.goto(`/pages/${ownerPageId}${part}`);
    await expect(member.getByTestId("page-missing")).toBeVisible();
    await expect(member.getByText("Harbor Books")).toHaveCount(0);
  }

  // Sign-ups: only the page's owner can read them.
  await owner.goto(`/pages/${ownerPageId}/signups`);
  await owner.getByTestId("signup-enabled").click();
  await owner.getByTestId("signup-save").click();
  await expect(owner.getByTestId("signup-saved")).toBeVisible();
  const posted = await runtime.fetch("/p/harbor-books/signup", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "reader@example.com" }),
  });
  expect(posted.status).toBe(200);
  expect(await posted.text()).not.toContain("reader@example.com");
  const csvPath = `/api/pages/${ownerPageId}/signups.csv`;
  expect((await runtime.fetch(csvPath, { role: "owner" })).status).toBe(200);
  expect((await runtime.fetch(csvPath, { role: "member" })).status).toBe(404);
  expect([401, 403]).toContain((await runtime.fetch(csvPath)).status);
  expect([401, 403]).toContain((await runtime.fetch(csvPath, { role: "outsider" })).status);

  // A change replayed by another member does nothing: capture the owner's
  // request switching an item off, switch it back, then send the same request as the member.
  await owner.goto(`/pages/${ownerPageId}`);
  const ownerToggle = owner.getByTestId("item-row").filter({ hasText: "Events calendar" }).getByTestId("item-enabled");
  const [request] = await Promise.all([
    owner.waitForRequest((req) => req.method() === "POST" && req.url().includes("_serverFn")),
    ownerToggle.click(),
  ]);
  await expect(ownerToggle).toHaveAttribute("aria-checked", "false");
  await ownerToggle.click();
  await expect(ownerToggle).toHaveAttribute("aria-checked", "true");
  const headers = { ...(await request.allHeaders()) };
  for (const name of Object.keys(headers)) if (name === "cookie" || name.startsWith(":")) delete headers[name];
  await member.goto("/");
  await member.evaluate(
    ({ url, body, headers }) => fetch(url, { method: "POST", body, headers }).then((r) => r.status),
    { url: request.url(), body: request.postData(), headers },
  );
  const db = await runtime.database();
  const row = await db.prepare("select enabled from items where title = ?").bind("Events calendar").first();
  expect(Number(row.enabled)).toBe(1);

  // Public routes: only a page's visible items, nothing of its owner.
  const publicHtml = await (await runtime.fetch("/p/harbor-books")).text();
  expect(publicHtml).toContain("Events calendar");
  const ownerRow = await db.prepare("select user_id from pages where handle = ?").bind("harbor-books").first();
  expect(publicHtml).not.toContain(ownerRow.user_id);
  const [memberItemId] = await publicLinkIds(runtime, "luis-runs");
  expect((await runtime.fetch(`/p/harbor-books/go/${memberItemId}`)).status).toBe(404);
  expect((await runtime.fetch(`/p/luis-runs/go/${memberItemId}`)).status).toBe(302);
  // Private paths stay closed to anonymous visitors and outsiders.
  for (const path of [`/pages/${ownerPageId}`, "/admin"]) {
    expect([401, 403]).toContain((await runtime.fetch(path)).status);
    expect([401, 403]).toContain((await runtime.fetch(path, { role: "outsider" })).status);
  }

  // Analytics count only the member's own page.
  await member.goto(`/pages/${memberPageId}/analytics`);
  const memberViews = Number(await member.getByTestId("stat-views").innerText());
  const realViews = await db.prepare("select count(*) as n from page_views v join pages p on p.id = v.page_id where p.handle = 'luis-runs'").first();
  expect(memberViews).toBe(Number(realViews.n));

  // Admin only: members see no list and cannot unpublish.
  await member.goto("/admin");
  await expect(member.getByTestId("admin-only")).toBeVisible();
  await expect(member.getByTestId("admin-row")).toHaveCount(0);
  await owner.goto("/admin");
  await expect(owner.getByTestId("admin-row")).toHaveCount(2);
  await owner.getByTestId("admin-row").filter({ hasText: "luis-runs" }).getByTestId("admin-unpublish").click();
  await owner.getByRole("alertdialog").getByRole("button", { name: "Unpublish" }).click();
  await expect(owner.getByTestId("admin-row").filter({ hasText: "luis-runs" }).getByTestId("admin-unpublish")).toHaveCount(0);
  expect((await runtime.fetch("/p/luis-runs")).status).toBe(404);
  expect((await runtime.fetch(`/p/luis-runs/go/${memberItemId}`)).status).toBe(404);
  expect((await runtime.fetch("/p/harbor-books")).status).toBe(200);

  // No sign-in of the app's own.
  for (const path of ["/login", "/signin", "/sign-in", "/signup", "/register", "/logout"]) {
    const response = await runtime.fetch(path, { role: "member" });
    const text = await response.text();
    expect(response.status).not.toBe(200);
    expect(text).not.toMatch(/type="password"/i);
  }
  console.log("authorization: ok");
} finally {
  await runtime.close();
}
