import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { isAdmin } from "@every-app/sdk/server";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import { env } from "cloudflare:workers";
import { z } from "zod";
import * as pages from "@/server/pages";
import { rememberUser } from "@/server/users";
import { found, input } from "./validate";

function publicUrl(handle: string): string {
  return new URL(`/p/${handle}`, getRequest().url).toString();
}

function avatarUrl(page: { handle: string; avatarKey: string | null }) {
  if (!page.avatarKey) return null;
  return `/p/${page.handle}/avatar?v=${page.avatarKey.split("/").pop()}`;
}

export const getMyPages = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(async ({ context: { user } }) => {
    await rememberUser(user);
    return { pages: await pages.listPages(user.id), admin: isAdmin(user) };
  });

export const createPage = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(pages.createPageInput))
  .handler(async ({ data, context: { user } }) => {
    await rememberUser(user);
    return pages.createPage(user.id, data);
  });

/** The page an editor tab is about, or null when it isn't this user's. */
export const getEditorPage = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator(input(pages.pageIdInput))
  .handler(async ({ data, context: { user } }) => {
    const page = await pages.getPage(user.id, data.pageId);
    if (!page) return null;
    const { avatarKey: _key, ...rest } = page;
    return { ...rest, avatarUrl: avatarUrl(page), publicUrl: publicUrl(page.handle) };
  });

export const setPublished = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(pages.setPublishedInput))
  .handler(async ({ data, context: { user } }) =>
    found(await pages.setPublished(user.id, data)),
  );

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(pages.updateProfileInput))
  .handler(async ({ data, context: { user } }) =>
    found(await pages.updateProfile(user.id, data)),
  );

export const updateSignupSettings = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(pages.signupSettingsInput))
  .handler(async ({ data, context: { user } }) =>
    found(await pages.updateSignupSettings(user.id, data)),
  );

export const deletePage = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(pages.pageIdInput))
  .handler(async ({ data, context: { user } }) => {
    const page = found(await pages.deletePage(user.id, data.pageId));
    if (page.avatarKey) await env.files.delete(page.avatarKey);
    return { id: page.id };
  });

const AVATAR_LIMIT = 2 * 1024 * 1024;

/** The image type from the file's first bytes: PNG, JPEG or WebP. */
function imageType(bytes: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export const uploadAvatar = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Choose an image.");
    const pageId = z.string().min(1).parse(data.get("pageId"));
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Choose an image.");
    return { pageId, file };
  })
  .handler(async ({ data, context: { user } }) => {
    found(await pages.getPage(user.id, data.pageId));
    if (data.file.size > AVATAR_LIMIT) throw new Error("Images can be up to 2 MB.");
    const bytes = new Uint8Array(await data.file.arrayBuffer());
    const type = imageType(bytes);
    if (!type) throw new Error("Use a PNG, JPEG or WebP image.");
    const key = `avatars/${data.pageId}/${crypto.randomUUID()}`;
    await env.files.put(key, bytes, { httpMetadata: { contentType: type } });
    const result = await pages.setAvatar(user.id, data.pageId, { key, type });
    if (!result) {
      await env.files.delete(key);
      throw new Error("Not found.");
    }
    if (result.previous) await env.files.delete(result.previous);
    return { ok: true };
  });

export const removeAvatar = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(pages.pageIdInput))
  .handler(async ({ data, context: { user } }) => {
    const result = found(await pages.setAvatar(user.id, data.pageId, null));
    if (result.previous) await env.files.delete(result.previous);
    return { ok: true };
  });

// Admins: every page in the install.
export const getAllPages = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(async ({ context: { user } }) => {
    if (!isAdmin(user)) return { admin: false as const, pages: [] };
    return { admin: true as const, pages: await pages.listAllPages() };
  });

export const adminUnpublish = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(pages.pageIdInput))
  .handler(async ({ data, context: { user } }) => {
    if (!isAdmin(user)) throw new Error("Only admins can do that.");
    return found(await pages.unpublishAny(data.pageId));
  });
