import { createFileRoute } from "@tanstack/react-router";
import { getEveryAppUser } from "@every-app/sdk/server";
import { env } from "cloudflare:workers";
import { getPage } from "@/server/pages";
import { listSignups, signupsCsv } from "@/server/signups";

// Private: the page's owner downloads its sign-ups.
export const Route = createFileRoute("/api/pages/$pageId/signups.csv")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await getEveryAppUser(request, env);
        if (!user) return new Response("Unauthorized", { status: 401 });
        const page = await getPage(user.id, params.pageId);
        if (!page) return new Response("Not found", { status: 404 });
        const rows = await listSignups(user.id, { pageId: page.id });
        return new Response(signupsCsv(rows), {
          headers: {
            "content-type": "text/csv; charset=utf-8",
            "content-disposition": `attachment; filename="${page.handle}-signups.csv"`,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
