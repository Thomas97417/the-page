export const SLOT_COUNT = 50;
export const RESERVATION_MS = 5 * 60 * 1000;

/** Shared by the form and the server; the server always validates again. */
export function validateContent(word: string, url?: string) {
  const normalized = word.normalize("NFC");
  const length = Array.from(normalized).length;
  if (length < 1 || length > 24 || /[\p{White_Space}\p{C}]/u.test(normalized)) {
    throw new Error("Choisissez un mot de 1 à 24 caractères, sans espace.");
  }
  const trimmedUrl = url?.trim();
  if (!trimmedUrl) return { word: normalized, url: undefined };
  try {
    const parsed = new URL(trimmedUrl);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      trimmedUrl.length > 2048
    )
      throw new Error();
    return { word: normalized, url: parsed.href };
  } catch {
    throw new Error("Le lien doit être une URL HTTPS valide.");
  }
}

export const priceFor = (acquisitions: number) => (acquisitions + 1) * 100;
