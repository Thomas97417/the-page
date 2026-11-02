export const DEFAULT_PAGE_ID = "world";

export const PAGES = [
  { id: DEFAULT_PAGE_ID, label: "World", symbol: "🌐", suffix: "world" },
  { id: "afrique-du-sud", label: "Afrique du Sud", symbol: "🇿🇦", suffix: "za" },
  { id: "algerie", label: "Algérie", symbol: "🇩🇿", suffix: "dz" },
  { id: "allemagne", label: "Allemagne", symbol: "🇩🇪", suffix: "de" },
  { id: "arabie-saoudite", label: "Arabie saoudite", symbol: "🇸🇦", suffix: "sa" },
  { id: "argentine", label: "Argentine", symbol: "🇦🇷", suffix: "ar" },
  { id: "australie", label: "Australie", symbol: "🇦🇺", suffix: "au" },
  { id: "autriche", label: "Autriche", symbol: "🇦🇹", suffix: "at" },
  { id: "belgique", label: "Belgique", symbol: "🇧🇪", suffix: "be" },
  { id: "bresil", label: "Brésil", symbol: "🇧🇷", suffix: "br" },
  { id: "cameroun", label: "Cameroun", symbol: "🇨🇲", suffix: "cm" },
  { id: "canada", label: "Canada", symbol: "🇨🇦", suffix: "ca" },
  { id: "chili", label: "Chili", symbol: "🇨🇱", suffix: "cl" },
  { id: "chine", label: "Chine", symbol: "🇨🇳", suffix: "cn" },
  { id: "colombie", label: "Colombie", symbol: "🇨🇴", suffix: "co" },
  { id: "coree-du-sud", label: "Corée du Sud", symbol: "🇰🇷", suffix: "kr" },
  { id: "cote-divoire", label: "Côte d’Ivoire", symbol: "🇨🇮", suffix: "ci" },
  { id: "danemark", label: "Danemark", symbol: "🇩🇰", suffix: "dk" },
  { id: "egypte", label: "Égypte", symbol: "🇪🇬", suffix: "eg" },
  { id: "emirats-arabes-unis", label: "Émirats arabes unis", symbol: "🇦🇪", suffix: "ae" },
  { id: "espagne", label: "Espagne", symbol: "🇪🇸", suffix: "es" },
  { id: "etats-unis", label: "États-Unis", symbol: "🇺🇸", suffix: "us" },
  { id: "finlande", label: "Finlande", symbol: "🇫🇮", suffix: "fi" },
  { id: "france", label: "France", symbol: "🇫🇷", suffix: "fr" },
  { id: "grece", label: "Grèce", symbol: "🇬🇷", suffix: "gr" },
  { id: "inde", label: "Inde", symbol: "🇮🇳", suffix: "in" },
  { id: "indonesie", label: "Indonésie", symbol: "🇮🇩", suffix: "id" },
  { id: "irlande", label: "Irlande", symbol: "🇮🇪", suffix: "ie" },
  { id: "israel", label: "Israël", symbol: "🇮🇱", suffix: "il" },
  { id: "italie", label: "Italie", symbol: "🇮🇹", suffix: "it" },
  { id: "japon", label: "Japon", symbol: "🇯🇵", suffix: "jp" },
  { id: "kenya", label: "Kenya", symbol: "🇰🇪", suffix: "ke" },
  { id: "liban", label: "Liban", symbol: "🇱🇧", suffix: "lb" },
  { id: "luxembourg", label: "Luxembourg", symbol: "🇱🇺", suffix: "lu" },
  { id: "madagascar", label: "Madagascar", symbol: "🇲🇬", suffix: "mg" },
  { id: "maroc", label: "Maroc", symbol: "🇲🇦", suffix: "ma" },
  { id: "mexique", label: "Mexique", symbol: "🇲🇽", suffix: "mx" },
  { id: "nigeria", label: "Nigeria", symbol: "🇳🇬", suffix: "ng" },
  { id: "norvege", label: "Norvège", symbol: "🇳🇴", suffix: "no" },
  { id: "nouvelle-zelande", label: "Nouvelle-Zélande", symbol: "🇳🇿", suffix: "nz" },
  { id: "pays-bas", label: "Pays-Bas", symbol: "🇳🇱", suffix: "nl" },
  { id: "pologne", label: "Pologne", symbol: "🇵🇱", suffix: "pl" },
  { id: "portugal", label: "Portugal", symbol: "🇵🇹", suffix: "pt" },
  { id: "roumanie", label: "Roumanie", symbol: "🇷🇴", suffix: "ro" },
  { id: "royaume-uni", label: "Royaume-Uni", symbol: "🇬🇧", suffix: "uk" },
  { id: "senegal", label: "Sénégal", symbol: "🇸🇳", suffix: "sn" },
  { id: "suede", label: "Suède", symbol: "🇸🇪", suffix: "se" },
  { id: "suisse", label: "Suisse", symbol: "🇨🇭", suffix: "ch" },
  { id: "tunisie", label: "Tunisie", symbol: "🇹🇳", suffix: "tn" },
  { id: "turquie", label: "Turquie", symbol: "🇹🇷", suffix: "tr" },
  { id: "vietnam", label: "Vietnam", symbol: "🇻🇳", suffix: "vn" },
] as const;

export type PageId = (typeof PAGES)[number]["id"];

export function isPageId(value: unknown): value is PageId {
  return PAGES.some((page) => page.id === value);
}

export function getPage(id: PageId) {
  return PAGES.find((page) => page.id === id)!;
}

export function pagePath(id: PageId) {
  return id === DEFAULT_PAGE_ID ? "/" : (`/${id}` as const);
}

export function pageIdFromPath(pathname: string): PageId | null {
  if (pathname === "/") return DEFAULT_PAGE_ID;
  const id = pathname.replace(/^\//, "").replace(/\/$/, "");
  return isPageId(id) ? id : null;
}

export function purchaseReturnPath(pageId: PageId, purchaseId: string) {
  return `${pagePath(pageId)}?purchase=${encodeURIComponent(purchaseId)}`;
}
