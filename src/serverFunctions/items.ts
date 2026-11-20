import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import * as items from "@/server/items";
import { pageIdInput } from "@/server/pages";
import { found, input } from "./validate";

export const getItems = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator(input(pageIdInput))
  .handler(({ data, context: { user } }) => items.listItems(user.id, data.pageId));

export const createItem = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(items.createItemInput))
  .handler(async ({ data, context: { user } }) => found(await items.createItem(user.id, data)));

export const updateItem = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(items.updateItemInput))
  .handler(async ({ data, context: { user } }) => found(await items.updateItem(user.id, data)));

export const setItemEnabled = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(items.setEnabledInput))
  .handler(async ({ data, context: { user } }) => found(await items.setItemEnabled(user.id, data)));

export const moveItem = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(items.moveItemInput))
  .handler(async ({ data, context: { user } }) => found(await items.moveItem(user.id, data)));

export const deleteItem = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(items.itemIdInput))
  .handler(async ({ data, context: { user } }) => found(await items.deleteItem(user.id, data)));
