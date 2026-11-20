import { z } from "zod";

// Words a handle can't be: the app's own paths and ones a visitor could mistake for it.
const RESERVED = new Set([
  "admin", "api", "app", "apps", "assets", "avatar", "go", "help", "home",
  "login", "logout", "mcp", "new", "p", "page", "pages", "settings",
  "signin", "signup", "static", "support", "www",
]);

export const handleSchema = z
  .string()
  .trim()
  .min(3, "Handles are 3 to 30 characters.")
  .max(30, "Handles are 3 to 30 characters.")
  .regex(
    /^[a-z0-9-]+$/,
    "Use lowercase letters, digits and hyphens only.",
  )
  .refine((handle) => !RESERVED.has(handle), "That handle is reserved.");

export const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a web address starting with http:// or https://.");

const isoOrNull = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional();

export const scheduleFields = { startsAt: isoOrNull, endsAt: isoOrNull };

/** Whether a link is shown now: switched on and inside its schedule. */
export function isLive(
  item: { enabled: boolean; startsAt: string | null; endsAt: string | null },
  now: Date,
): boolean {
  if (!item.enabled) return false;
  if (item.startsAt && new Date(item.startsAt) > now) return false;
  if (item.endsAt && new Date(item.endsAt) <= now) return false;
  return true;
}

/** A thrown error whose message the page shows. */
export class InputError extends Error {}

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form.";
}
