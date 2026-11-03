import betterAuth from "@convex-dev/better-auth/convex.config";
import resend from "@convex-dev/resend/convex.config.js";
import r2 from "@convex-dev/r2/convex.config.js";
import { defineApp } from "convex/server";
import polar from "@convex-dev/polar/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp();
app.use(betterAuth);
app.use(resend);
app.use(r2);
app.use(polar);
app.use(rateLimiter);

export default app;
