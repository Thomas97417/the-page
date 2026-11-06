import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { polar, paymentConfigured } from "./polar";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);
if (paymentConfigured())
  polar.registerRoutes(http, {
    events: {
      "order.paid": async (ctx, event) => {
        if (!("runAction" in ctx))
          throw new Error("Polar webhook requires an action context");
        if (typeof event.data.metadata.purchaseId === "string") {
          await ctx.runAction(internal.payments.verifyOrder, {
            orderId: event.data.id,
          });
        }
      },
      "order.refunded": async (ctx, event) => {
        await ctx.runMutation(internal.purchases.markRefunded, {
          orderId: event.data.id,
          refundedAmount:
            event.data.refundedAmount + event.data.refundedTaxAmount,
          complete:
            event.data.refundedAmount + event.data.refundedTaxAmount >=
            event.data.totalAmount,
        });
      },
    },
  });
else
  http.route({
    path: "/polar/events",
    method: "POST",
    handler: httpAction(
      async () =>
        new Response("Polar billing is not configured", { status: 503 }),
    ),
  });

export default http;
