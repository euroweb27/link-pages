import type { z } from "zod";
import { firstIssue } from "@/server/rules";

/** A server function validator whose error message the page can show as is. */
export function input<T extends z.ZodType>(schema: T) {
  return (data: unknown): z.infer<T> => {
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new Error(firstIssue(parsed.error));
    return parsed.data;
  };
}

export function found<T>(value: T | null): T {
  if (value === null) throw new Error("Not found.");
  return value;
}
