// The frozen features' main paths: the editor (F001), the public page and its
// redirects (F002), the sign-up form (F003), analytics (F004) and the QR code (F005).
import { startRuntime } from "/home/user/oss-new/control/runtime/index.mjs";
import { PNG, addItem, createPage, expect, itemRow, publicLinkIds, setPublished } from "./lib.mjs";

const runtime = await startRuntime();
try {
  const owner = await (await runtime.context("owner")).newPage();
  await owner.goto("/");
  await runtime.assertBackLink(owner);

  // F001: handle rules.
  await owner.getByTestId("new-page").click();
  for (const bad of ["ab", "Has Space", "admin"]) {
    await owner.getByTestId("page-handle").fill(bad);
    await owner.getByTestId("page-name").fill("Bad handle");
    await owner.getByTestId("create-page-submit").click();
    await expect(owner.getByTestId("form-error")).toBeVisible();
  }
  await owner.keyboard.press("Escape");

  const pageId = await createPage(owner, { handle: "maya-ceramics", name: "Maya Ortiz Ceramics" });
  await runtime.assertBackLink(owner);

  // Items: a header, links, featured, disabled, scheduled out.
  await addItem(owner, { title: "Shop & studio" });
  await addItem(owner, { title: "Spring kiln sale", url: "https://shop.example.com/spring", featured: true });
  await addItem(owner, { title: "Wheel-throwing classes", url: "https://classes.example.com/" });
  await addItem(owner, { title: "Old price list", url: "https://example.com/prices-2023" });
  await addItem(owner, { title: "Holiday market", url: "https://example.com/market", startsAt: "2031-12-01T09:00" });
  await addItem(owner, { title: "Studio journal", url: "https://journal.example.com/" });

  // A non-web URL is refused.
  await owner.getByTestId("add-link").click();
  await owner.getByRole("dialog").getByTestId("item-title").fill("Bad link");
  await owner.getByRole("dialog").getByTestId("item-url").fill("javascript:alert(1)");
  await owner.getByRole("dialog").getByTestId("item-save").click();
  await expect(owner.getByRole("dialog").getByTestId("form-error")).toBeVisible();
  await owner.keyboard.press("Escape");
  await expect(owner.getByTestId("item-row")).toHaveCount(6);

  // Switch one off, reorder, edit, delete.
  await itemRow(owner, "Old price list").getByTestId("item-enabled").click();
  await expect(itemRow(owner, "Old price list").getByTestId("item-enabled")).toHaveAttribute("aria-checked", "false");
  await itemRow(owner, "Wheel-throwing classes").getByTestId("item-up").click();
  await expect(owner.getByTestId("item-row").nth(1)).toContainText("Wheel-throwing classes");
  await itemRow(owner, "Wheel-throwing classes").getByTestId("item-down").click();
  await expect(owner.getByTestId("item-row").nth(2)).toContainText("Wheel-throwing classes");
  await itemRow(owner, "Studio journal").getByTestId("item-edit").click();
  await owner.getByRole("dialog").getByTestId("item-title").fill("Studio journal & firing notes");
  await owner.getByRole("dialog").getByTestId("item-save").click();
  await expect(itemRow(owner, "Studio journal & firing notes")).toHaveCount(1);
  await addItem(owner, { title: "Temporary", url: "https://example.com/tmp" });
  await itemRow(owner, "Temporary").getByTestId("item-delete").click();
  await owner.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(itemRow(owner, "Temporary")).toHaveCount(0);

  // Profile: bio, avatar, appearance.
  await owner.getByTestId("tab-profile").click();
  await owner.getByTestId("profile-bio").fill("Hand-thrown stoneware from a small studio in Porto.");
  await owner.getByTestId("theme-dark").click();
  await owner.getByTestId("shape-square").click();
  await owner.getByTestId("profile-save").click();
  await expect(owner.getByTestId("profile-saved")).toBeVisible();
  await owner.getByTestId("avatar-input").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
  await expect(owner.getByTestId("avatar-preview")).toBeVisible();
  // Too large or the wrong type is refused.
  await owner.getByTestId("avatar-input").setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.concat([PNG, Buffer.alloc(2_100_000)]) });
  await expect(owner.getByTestId("avatar-error")).toBeVisible();

  // F002: unpublished is not public; published is.
  expect((await runtime.fetch("/p/maya-ceramics")).status).toBe(404);
  expect((await runtime.fetch("/p/nobody-here")).status).toBe(404);
  await setPublished(owner, true);
  const visitorContext = await runtime.context(null);
  const visitor = await visitorContext.newPage();
  await visitor.goto("/p/maya-ceramics?src=newsletter");
  await expect(visitor.getByTestId("public-name")).toHaveText("Maya Ortiz Ceramics");
  await expect(visitor.getByTestId("public-bio")).toHaveText("Hand-thrown stoneware from a small studio in Porto.");
  await expect(visitor.getByTestId("public-avatar")).toBeVisible();
  await expect(visitor.getByTestId("public-header")).toHaveText(["Shop & studio"]);
  await expect(visitor.getByTestId("public-link")).toHaveText(["Spring kiln sale", "Wheel-throwing classes", "Studio journal & firing notes"]);
  await expect(visitor.getByTestId("public-link").first()).toHaveAttribute("data-featured", "true");
  await expect(visitor.getByTestId("public-link").nth(1)).toHaveAttribute("data-featured", "false");
  const html = await visitor.content();
  for (const hidden of ["Old price list", "Holiday market", "Temporary"]) expect(html).not.toContain(hidden);
  const avatarSrc = await visitor.getByTestId("public-avatar").getAttribute("src");
  const avatar = await runtime.fetch(avatarSrc);
  expect(avatar.status).toBe(200);
  expect(avatar.headers.get("content-type")).toBe("image/png");

  // Redirects: visible items only.
  const [saleId] = await publicLinkIds(runtime, "maya-ceramics");
  const go = await runtime.fetch(`/p/maya-ceramics/go/${saleId}`);
  expect(go.status).toBe(302);
  expect(go.headers.get("location")).toBe("https://shop.example.com/spring");
  await runtime.fetch(`/p/maya-ceramics/go/${saleId}`, { headers: { referer: "https://social.example.net/" } });
  const db = await runtime.database();
  const idOf = async (title) => (await db.prepare("select id from items where title = ?").bind(title).first()).id;
  expect((await runtime.fetch(`/p/maya-ceramics/go/${await idOf("Old price list")}`)).status).toBe(404);
  expect((await runtime.fetch(`/p/maya-ceramics/go/${await idOf("Holiday market")}`)).status).toBe(404);
  expect((await runtime.fetch(`/p/maya-ceramics/go/${await idOf("Shop & studio")}`)).status).toBe(404);
  expect((await runtime.fetch(`/p/maya-ceramics/go/not-an-item`)).status).toBe(404);
  // A visitor's click goes through the redirect.
  const [redirect] = await Promise.all([
    visitor.waitForResponse((response) => response.url().includes(`/go/${saleId}`)),
    visitor.getByTestId("public-link").first().click({ noWaitAfter: true }),
  ]);
  expect(redirect.status()).toBe(302);

  // F003: the sign-up form.
  await owner.getByTestId("tab-signups").click();
  await owner.getByTestId("signup-enabled").click();
  await owner.getByTestId("signup-heading").fill("Hear about the next kiln opening");
  await owner.getByTestId("signup-ask-details").click();
  await owner.getByTestId("signup-save").click();
  await expect(owner.getByTestId("signup-saved")).toBeVisible();
  await visitor.goto("/p/maya-ceramics");
  await expect(visitor.getByTestId("signup-form")).toContainText("Hear about the next kiln opening");
  await visitor.getByTestId("signup-form").locator('input[name="email"]').fill("ines.carvalho@example.org");
  await visitor.getByTestId("signup-form").locator('input[name="name"]').fill("Inês Carvalho");
  await visitor.getByTestId("signup-form").locator('input[name="phone"]').fill("+351 912 345 678");
  await Promise.all([visitor.waitForURL(/joined=1/), visitor.getByTestId("signup-form").getByRole("button").click()]);
  await expect(visitor.getByTestId("signup-thanks")).toBeVisible();

  const post = (body) =>
    runtime.fetch("/p/maya-ceramics/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  expect((await post({ email: "tom.baker@example.com", name: "Tom" })).status).toBe(200);
  expect((await post({ email: "tom.baker@example.com", name: "Tom Baker", phone: "555 0102" })).status).toBe(200);
  expect((await post({ email: "not-an-email" })).status).toBe(400);
  expect((await post({ email: "bot@example.com", website: "http://spam.example" })).status).toBe(200);
  expect((await runtime.fetch("/p/nobody-here/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "a@example.com" }) })).status).toBe(404);

  await owner.reload();
  const rows = owner.getByTestId("signup-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("tom.baker@example.com");
  await expect(rows.first()).toContainText("Tom Baker");
  await expect(rows.nth(1)).toContainText("ines.carvalho@example.org");
  await expect(owner.getByText("bot@example.com")).toHaveCount(0);
  await owner.getByTestId("signup-search").fill("inês");
  await expect(rows).toHaveCount(1);
  await owner.getByTestId("signup-search").fill("");
  await expect(rows).toHaveCount(2);
  const csvHref = await owner.getByTestId("signup-download").getAttribute("href");
  const csv = await runtime.fetch(csvHref, { role: "owner" });
  expect(csv.status).toBe(200);
  expect(csv.headers.get("content-type")).toContain("text/csv");
  const csvText = await csv.text();
  expect(csvText).toContain("tom.baker@example.com");
  expect(csvText).toContain("Inês Carvalho");
  await post({ email: "remove.me@example.com" });
  await owner.reload();
  await rows.filter({ hasText: "remove.me@example.com" }).getByTestId("signup-delete").click();
  await owner.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(rows).toHaveCount(2);

  // F005: the QR code.
  await owner.getByTestId("tab-qr").click();
  const qrUrl = new URL(await owner.getByTestId("qr-url").innerText());
  expect(qrUrl.hostname).toBe(runtime.hostname);
  expect(qrUrl.pathname).toBe("/p/maya-ceramics");
  expect(qrUrl.searchParams.get("src")).toBe("qr");
  await expect(owner.getByTestId("qr-image").locator("svg")).toBeVisible();
  const svgBefore = await owner.getByTestId("qr-svg").getAttribute("href");
  expect(svgBefore).toMatch(/^data:image\/svg\+xml/);
  expect(await owner.getByTestId("qr-png").getAttribute("href")).toMatch(/^data:image\/png;base64,/);
  await owner.getByTestId("tab-profile").click();
  await owner.getByTestId("profile-bio").fill("Hand-thrown stoneware and glaze workshops in Porto.");
  await owner.getByTestId("profile-save").click();
  await expect(owner.getByTestId("profile-saved")).toBeVisible();
  await owner.getByTestId("tab-qr").click();
  await expect(owner.getByTestId("qr-svg")).toHaveAttribute("href", svgBefore);
  // A scan.
  expect((await runtime.fetch(`${qrUrl.pathname}${qrUrl.search}`)).status).toBe(200);
  expect((await runtime.fetch(`${qrUrl.pathname}${qrUrl.search}`)).status).toBe(200);

  // F004: analytics.
  await owner.getByTestId("tab-analytics").click();
  await expect(owner.getByTestId("stat-views")).not.toHaveText("0");
  await expect(owner.getByTestId("stat-clicks")).toHaveText("3");
  await expect(owner.getByTestId("stat-ctr")).toContainText("%");
  await expect(owner.getByTestId("top-sources")).toContainText("qr");
  await expect(owner.getByTestId("top-sources")).toContainText("newsletter");
  await expect(owner.getByTestId("clicks-by-link").getByRole("row").filter({ hasText: "Spring kiln sale" })).toContainText("3");
  await expect(owner.getByTestId("top-countries").getByRole("row")).not.toHaveCount(0);
  await expect(owner.getByTestId("views-chart")).toBeVisible();
  await owner.getByTestId("range-30").click();
  await expect(owner.getByTestId("stat-clicks")).toHaveText("3");

  // The editor with the finished page on screen.
  await owner.getByTestId("tab-links").click();
  await expect(owner.getByTestId("item-row")).toHaveCount(6);
  await runtime.assertBackLink(owner);
  await runtime.screenshot(owner);

  // Phone-sized smoke: the public page and the home screen.
  const phone = await (await runtime.context(null, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await phone.goto("/p/maya-ceramics");
  await expect(phone.getByTestId("public-link").first()).toBeVisible();
  expect(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const phoneMember = await (await runtime.context("owner", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await phoneMember.goto("/");
  await expect(phoneMember.getByTestId("page-row")).toHaveCount(1);
  console.log("behavior: ok");
} finally {
  await runtime.close();
}
