import { createFileRoute } from "@tanstack/react-router";
import { countryOf, findLiveLink, recordClick } from "@/server/publicPage";
import { notFound } from "../index";

// Public: counts the click and sends the visitor on, only for a link the page shows now.
export const Route = createFileRoute("/p/$handle/go/$itemId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const link = await findLiveLink(params.handle, params.itemId);
        if (!link) return notFound();
        await recordClick(link.pageId, params.itemId, countryOf(request));
        return new Response(null, {
          status: 302,
          headers: { location: link.url, "cache-control": "no-store" },
        });
      },
    },
  },
});
