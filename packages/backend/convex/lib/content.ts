export const SLOT_COUNT = 50;
export const RESERVATION_MS = 5 * 60 * 1000;
export const DESCRIPTION_MAX_LENGTH = 160;

/** Shared by the form and the server; the server always validates again. */
export function validateContent(word: string, url?: string, description?: string) {
  const normalized = word.normalize("NFC");
  const length = Array.from(normalized).length;
  if (length < 1 || length > 24 || /[\p{White_Space}\p{C}]/u.test(normalized)) {
    throw new Error("Choisissez un mot de 1 à 24 caractères, sans espace.");
  }
  const normalizedDescription = description?.normalize("NFC").trim();
  if (Array.from(normalizedDescription ?? "").length > DESCRIPTION_MAX_LENGTH) {
    throw new Error(
      `La description doit contenir au maximum ${DESCRIPTION_MAX_LENGTH} caractères.`,
    );
  }
  const content = {
    word: normalized,
    description: normalizedDescription || undefined,
  };
  const trimmedUrl = url?.trim();
  if (!trimmedUrl) return { ...content, url: undefined };
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
    return { ...content, url: parsed.href };
  } catch {
    throw new Error("Le lien doit être une URL HTTPS valide.");
  }
}

export const priceFor = (acquisitions: number) => (acquisitions + 1) * 100;
