import { createFileRoute } from "@tanstack/react-router";
import { getPublishedPage } from "@/server/publicPage";
import { saveSignup, signupPost } from "@/server/signups";
import { notFound } from "./index";

// Public: a visitor joins a page's list. JSON or an HTML form post.
export const Route = createFileRoute("/p/$handle/signup")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const page = await getPublishedPage(params.handle);
        if (!page || !page.signupEnabled) return notFound();
        const json = (request.headers.get("content-type") ?? "").includes("application/json");
        const body = await readBody(request, json);
        if (body === null) return reply(json, page.handle, 400, "invalid");
        const back = (status: number, code: string) => reply(json, page.handle, status, code);
        // The hidden field: a person never fills it, so the post is dropped quietly.
        if (typeof body.website === "string" && body.website.trim() !== "") {
          return back(200, "ok");
        }
        const parsed = signupPost.safeParse({
          email: str(body.email),
          name: str(body.name),
          phone: str(body.phone),
        });
        if (!parsed.success) return back(400, "email");
        await saveSignup(page, parsed.data);
        return back(200, "ok");
      },
    },
  },
});

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function readBody(request: Request, json: boolean): Promise<Record<string, unknown> | null> {
  try {
    if (json) {
      const value: unknown = await request.json();
      return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
    }
    return Object.fromEntries((await request.formData()).entries());
  } catch {
    return null;
  }
}

function reply(json: boolean, handle: string, status: number, code: string): Response {
  if (json) {
    return Response.json(
      code === "ok" ? { ok: true } : { error: code === "email" ? "Enter a valid email address." : "Invalid request." },
      { status },
    );
  }
  const query = code === "ok" ? "joined=1" : `signup=${code}`;
  return new Response(null, {
    status: 303,
    headers: { location: `/p/${handle}?${query}#signup` },
  });
}
