import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval(
  "recover payments and refunds",
  { minutes: 5 },
  internal.payments.recover,
  {},
);
export default crons;
