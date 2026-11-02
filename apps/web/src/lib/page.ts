import { ConvexError } from "convex/values";

export const euros = (amount: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: Number.isInteger(amount / 100) ? 0 : 2,
  }).format(amount / 100);

export function errorMessage(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "string")
    return error.data;
  return "Une erreur est survenue. Réessayez.";
}

export function returnPath() {
  try {
    const value = sessionStorage.getItem("the-page:return");
    return value?.startsWith("/?purchase=") ? value : "/";
  } catch {
    return "/";
  }
}
