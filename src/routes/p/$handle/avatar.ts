import { createFileRoute } from "@tanstack/react-router";
import { getEveryAppUser } from "@every-app/sdk/server";
import { env } from "cloudflare:workers";
import { findAvatar } from "@/server/publicPage";
import { notFound } from "./index";

// Public: a published page's picture, or the owner's own while unpublished.
export const Route = createFileRoute("/p/$handle/avatar")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const viewer = await getEveryAppUser(request, env);
        const avatar = await findAvatar(params.handle, viewer?.id ?? null);
        if (!avatar) return notFound();
        const object = await env.files.get(avatar.key);
        if (!object) return notFound();
        return new Response(object.body, {
          headers: {
            "content-type": avatar.type,
            "cache-control": "private, max-age=300",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
