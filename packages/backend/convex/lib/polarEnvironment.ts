export function getPolarServer(): "sandbox" | "production" {
  // Convex environment variables are configured separately for each deployment.
  const server = process.env.POLAR_SERVER ?? "sandbox";
  if (server !== "sandbox" && server !== "production") {
    throw new Error("POLAR_SERVER must be sandbox or production");
  }
  return server;
}
