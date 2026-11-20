import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import * as signups from "@/server/signups";
import { found, input } from "./validate";

export const getSignups = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator(input(signups.listSignupsInput))
  .handler(({ data, context: { user } }) => signups.listSignups(user.id, data));

export const deleteSignup = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(input(signups.deleteSignupInput))
  .handler(async ({ data, context: { user } }) => found(await signups.deleteSignup(user.id, data)));
