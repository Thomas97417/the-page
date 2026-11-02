import { ConvexError } from "convex/values";
import type { TFunction } from "i18next";
import type fr from "../locales/fr.json";

type ErrorKey = keyof typeof fr.errors;

// Keep the existing backend error contract, translating only known public errors.
const ERROR_KEYS: Record<string, ErrorKey> = {
  INVALID_EMAIL_OR_PASSWORD: "credentials",
  INVALID_PASSWORD: "credentials",
  INVALID_EMAIL: "invalidEmail",
  EMAIL_NOT_VERIFIED: "verifyEmail",
  USER_ALREADY_EXISTS: "accountExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "accountExists",
  PASSWORD_TOO_SHORT: "passwordMinimum",
  PASSWORD_TOO_LONG: "passwordMaximum",
  INVALID_TOKEN: "invalidToken",
  TOKEN_EXPIRED: "invalidToken",
  PASSWORD_MISMATCH: "passwordMismatch",
  PASSWORD_REQUIRED: "passwordRequired",
  NAME_TOO_SHORT: "nameMinimum",
  TOO_MANY_REQUESTS: "rateLimit",
  SLOT_UNAVAILABLE: "slotUnavailable",
  AUTH_ERROR: "auth",
  "Choisissez un mot de 1 à 24 caractères, sans espace.": "word",
  "La description doit contenir au maximum 160 caractères.": "description",
  "Le lien doit être une URL HTTPS valide.": "url",
  "Cet emplacement n’est plus disponible.": "slotUnavailable",
  "Emplacement introuvable.": "slotNotFound",
  "Cet emplacement ne vous appartient plus.": "slotLost",
  "Ce mot a été retiré par la modération.": "wordRemoved",
  "Le propriétaire a changé. Actualisez la liste.": "ownerChanged",
  "Le prix a changé. Vérifiez le nouveau montant.": "priceChanged",
  "Cet emplacement vous appartient. Modifiez votre mot gratuitement dans Mes mots.": "alreadyOwned",
  "Un paiement est déjà en cours sur cet emplacement.": "alreadyReserved",
  "Terminez votre paiement en cours ou attendez la fin de sa réservation.": "purchasePending",
  "Trop de tentatives. Réessayez dans quelques minutes.": "purchaseLimit",
  "Le paiement est momentanément indisponible.": "paymentUnavailable",
  "Le paiement se prépare. Réessayez dans un instant.": "paymentPreparing",
  "Le paiement n’a pas pu être ouvert. Réessayez.": "paymentFailed",
  "Connectez-vous pour continuer.": "signIn",
  "Accès réservé à l’administration.": "admin",
};

export function errorMessage(error: unknown, t: TFunction) {
  let message: unknown = error;
  if (error instanceof ConvexError) message = error.data;
  else if (error && typeof error === "object" && "code" in error)
    message = error.code;
  else if (error instanceof Error) message = error.message;
  const key = typeof message === "string" && Object.hasOwn(ERROR_KEYS, message)
    ? ERROR_KEYS[message]
    : undefined;
  return t(`errors.${key ?? "generic"}`);
}
