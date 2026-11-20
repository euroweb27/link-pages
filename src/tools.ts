// The app's tools for AI clients, served by the Gateway with the signed-in user.
import { ToolError, defineTools } from "@every-app/sdk/server";
import { z } from "zod";
import * as items from "@/server/items";
import * as pages from "@/server/pages";

export const tools = defineTools(
  {
    list_pages: {
      description: "List the user's link pages with their handles and whether each is published.",
      risk: "read",
      input: z.object({}).strict(),
      handler: (_input, { user }) => pages.listPages(user.id),
    },
    list_items: {
      description: "List the links and headers on one of the user's pages, in order.",
      risk: "read",
      input: pages.pageIdInput,
      handler: (input, { user }) => items.listItems(user.id, input.pageId),
    },
    add_link: {
      description: "Add a link to the end of one of the user's pages.",
      risk: "write",
      idempotent: false,
      input: z
        .object({ pageId: z.string().min(1), title: z.string().min(1).max(120), url: z.string().url() })
        .strict(),
      handler: async (input, { user }) =>
        (await items.createItem(user.id, { ...input, kind: "link" }).catch((error: unknown) => {
          throw new ToolError(error instanceof Error ? error.message : "Could not add the link");
        })) ?? raise("No page with that id"),
    },
  },
  {
    instructions: "Never guess page ids: call list_pages first.",
  },
);

function raise(message: string): never {
  throw new ToolError(message);
}
