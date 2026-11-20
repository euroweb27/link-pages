// Shared steps for the suites: each one drives the app the way a person does.
import { expect } from "/home/user/oss-new/control/runtime/index.mjs";

export { expect };

// A 1×1 PNG, enough to stand in for a profile picture.
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/** Creates a page from the home screen and returns its id (from the editor's URL). */
export async function createPage(page, { handle, name }) {
  await page.goto("/");
  await page.getByTestId("new-page").click();
  await page.getByTestId("page-handle").fill(handle);
  await page.getByTestId("page-name").fill(name);
  await Promise.all([
    page.waitForURL(/\/pages\/[^/]+$/),
    page.getByTestId("create-page-submit").click(),
  ]);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  return new URL(page.url()).pathname.split("/")[2];
}

/** Adds a link (or a header when `url` is absent) on the open editor. */
export async function addItem(page, { title, url, featured, startsAt, endsAt }) {
  const before = await page.getByTestId("item-row").count();
  await page.getByTestId(url === undefined ? "add-header" : "add-link").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByTestId("item-title").fill(title);
  if (url !== undefined) await dialog.getByTestId("item-url").fill(url);
  if (featured) await dialog.getByTestId("item-featured").click();
  if (startsAt) await dialog.getByTestId("item-starts").fill(startsAt);
  if (endsAt) await dialog.getByTestId("item-ends").fill(endsAt);
  await dialog.getByTestId("item-save").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("item-row")).toHaveCount(before + 1);
}

export function itemRow(page, title) {
  return page.getByTestId("item-row").filter({ hasText: title });
}

export async function setPublished(page, on) {
  const toggle = page.getByTestId("published-switch");
  if ((await toggle.getAttribute("aria-checked")) !== String(on)) {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute("aria-checked", String(on));
}

/** Item ids in public order, read from the public page's links. */
export async function publicLinkIds(runtime, handle) {
  const html = await (await runtime.fetch(`/p/${handle}`)).text();
  return [...html.matchAll(new RegExp(`/p/${handle}/go/([A-Za-z0-9-]+)`, "g"))].map(
    (match) => match[1],
  );
}
