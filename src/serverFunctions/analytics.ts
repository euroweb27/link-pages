import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import * as analytics from "@/server/analytics";
import { input } from "./validate";

export const getAnalytics = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator(input(analytics.analyticsInput))
  .handler(({ data, context: { user } }) => analytics.getAnalytics(user.id, data));
