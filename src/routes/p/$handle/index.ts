import { createFileRoute } from "@tanstack/react-router";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { PublicPageView } from "@/client/public/PublicPageView";
import appCss from "@/client/styles/app.css?url";
import {
  countryOf,
  getPublishedPage,
  recordView,
  sourceOf,
} from "@/server/publicPage";

const SIGNUP_ERRORS: Record<string, string> = {
  email: "Enter a valid email address.",
};

// Public: a published page for anyone with its address; 404 otherwise.
export const Route = createFileRoute("/p/$handle/")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const page = await getPublishedPage(params.handle);
        if (!page) return notFound();
        const url = new URL(request.url);
        const joined = url.searchParams.get("joined") === "1";
        const signupError = SIGNUP_ERRORS[url.searchParams.get("signup") ?? ""] ?? null;
        // A return from the sign-up form is the same visit, not a new one.
        if (!joined && !signupError) {
          await recordView(page.id, sourceOf(request), countryOf(request));
        }
        const html = renderToString(
          createElement(PublicPageView, { page, stylesheet: appCss, joined, signupError }),
        );
        return new Response(`<!doctype html>${html}`, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            "referrer-policy": "strict-origin-when-cross-origin",
          },
        });
      },
    },
  },
});

export function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
