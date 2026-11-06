import { httpRouter } from "convex/server";
import { registerRoutes } from "@convex-dev/stripe";
import { authComponent, createAuth } from "./auth";
import { httpAction } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { getStripeMode, paymentConfigured } from "./lib/stripeEnvironment";
import { PAYMENT_APP } from "./lib/orders";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);
if (paymentConfigured())
  registerRoutes(http, components.stripe, {
    webhookPath: "/stripe/webhook",
    onEvent: async (_ctx, event) => {
      if (event.livemode !== (getStripeMode() === "live"))
        throw new Error("Stripe event mode does not match this deployment");
    },
    events: {
      "checkout.session.completed": async (ctx, event) => {
        if (event.data.object.metadata?.app === PAYMENT_APP)
          await ctx.runAction(internal.payments.verifyCheckout, {
            checkoutId: event.data.object.id,
          });
      },
      "checkout.session.async_payment_succeeded": async (ctx, event) => {
        if (event.data.object.metadata?.app === PAYMENT_APP)
          await ctx.runAction(internal.payments.verifyCheckout, {
            checkoutId: event.data.object.id,
          });
      },
      "charge.refunded": async (ctx, event) => {
        const intent = event.data.object.payment_intent;
        if (intent)
          await ctx.runAction(internal.payments.verifyRefund, {
            orderId: typeof intent === "string" ? intent : intent.id,
          });
      },
    },
  });
else
  http.route({
    path: "/stripe/webhook",
    method: "POST",
    handler: httpAction(
      async () =>
        new Response("Stripe billing is not configured", { status: 503 }),
    ),
  });

export default http;
