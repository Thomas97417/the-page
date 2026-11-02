export const DEFAULT_PAGE_ID = "world";

// IDs are persisted in Convex; slugs define the public URLs independently.
export const PAGES = [
  { id: DEFAULT_PAGE_ID, slug: "world", label: "World", symbol: "🌐", suffix: "world" },
  { id: "afrique-du-sud", slug: "south-africa", label: "Afrique du Sud", symbol: "🇿🇦", suffix: "za" },
  { id: "algerie", slug: "algeria", label: "Algérie", symbol: "🇩🇿", suffix: "dz" },
  { id: "allemagne", slug: "germany", label: "Allemagne", symbol: "🇩🇪", suffix: "de" },
  { id: "arabie-saoudite", slug: "saudi-arabia", label: "Arabie saoudite", symbol: "🇸🇦", suffix: "sa" },
  { id: "argentine", slug: "argentina", label: "Argentine", symbol: "🇦🇷", suffix: "ar" },
  { id: "australie", slug: "australia", label: "Australie", symbol: "🇦🇺", suffix: "au" },
  { id: "autriche", slug: "austria", label: "Autriche", symbol: "🇦🇹", suffix: "at" },
  { id: "belgique", slug: "belgium", label: "Belgique", symbol: "🇧🇪", suffix: "be" },
  { id: "bresil", slug: "brazil", label: "Brésil", symbol: "🇧🇷", suffix: "br" },
  { id: "cameroun", slug: "cameroon", label: "Cameroun", symbol: "🇨🇲", suffix: "cm" },
  { id: "canada", slug: "canada", label: "Canada", symbol: "🇨🇦", suffix: "ca" },
  { id: "chili", slug: "chile", label: "Chili", symbol: "🇨🇱", suffix: "cl" },
  { id: "chine", slug: "china", label: "Chine", symbol: "🇨🇳", suffix: "cn" },
  { id: "colombie", slug: "colombia", label: "Colombie", symbol: "🇨🇴", suffix: "co" },
  { id: "coree-du-sud", slug: "south-korea", label: "Corée du Sud", symbol: "🇰🇷", suffix: "kr" },
  { id: "cote-divoire", slug: "ivory-coast", label: "Côte d’Ivoire", symbol: "🇨🇮", suffix: "ci" },
  { id: "danemark", slug: "denmark", label: "Danemark", symbol: "🇩🇰", suffix: "dk" },
  { id: "egypte", slug: "egypt", label: "Égypte", symbol: "🇪🇬", suffix: "eg" },
  { id: "emirats-arabes-unis", slug: "united-arab-emirates", label: "Émirats arabes unis", symbol: "🇦🇪", suffix: "ae" },
  { id: "espagne", slug: "spain", label: "Espagne", symbol: "🇪🇸", suffix: "es" },
  { id: "etats-unis", slug: "united-states", label: "États-Unis", symbol: "🇺🇸", suffix: "us" },
  { id: "finlande", slug: "finland", label: "Finlande", symbol: "🇫🇮", suffix: "fi" },
  { id: "france", slug: "france", label: "France", symbol: "🇫🇷", suffix: "fr" },
  { id: "grece", slug: "greece", label: "Grèce", symbol: "🇬🇷", suffix: "gr" },
  { id: "inde", slug: "india", label: "Inde", symbol: "🇮🇳", suffix: "in" },
  { id: "indonesie", slug: "indonesia", label: "Indonésie", symbol: "🇮🇩", suffix: "id" },
  { id: "irlande", slug: "ireland", label: "Irlande", symbol: "🇮🇪", suffix: "ie" },
  { id: "israel", slug: "israel", label: "Israël", symbol: "🇮🇱", suffix: "il" },
  { id: "italie", slug: "italy", label: "Italie", symbol: "🇮🇹", suffix: "it" },
  { id: "japon", slug: "japan", label: "Japon", symbol: "🇯🇵", suffix: "jp" },
  { id: "kenya", slug: "kenya", label: "Kenya", symbol: "🇰🇪", suffix: "ke" },
  { id: "liban", slug: "lebanon", label: "Liban", symbol: "🇱🇧", suffix: "lb" },
  { id: "luxembourg", slug: "luxembourg", label: "Luxembourg", symbol: "🇱🇺", suffix: "lu" },
  { id: "madagascar", slug: "madagascar", label: "Madagascar", symbol: "🇲🇬", suffix: "mg" },
  { id: "maroc", slug: "morocco", label: "Maroc", symbol: "🇲🇦", suffix: "ma" },
  { id: "mexique", slug: "mexico", label: "Mexique", symbol: "🇲🇽", suffix: "mx" },
  { id: "nigeria", slug: "nigeria", label: "Nigeria", symbol: "🇳🇬", suffix: "ng" },
  { id: "norvege", slug: "norway", label: "Norvège", symbol: "🇳🇴", suffix: "no" },
  { id: "nouvelle-zelande", slug: "new-zealand", label: "Nouvelle-Zélande", symbol: "🇳🇿", suffix: "nz" },
  { id: "pays-bas", slug: "netherlands", label: "Pays-Bas", symbol: "🇳🇱", suffix: "nl" },
  { id: "pologne", slug: "poland", label: "Pologne", symbol: "🇵🇱", suffix: "pl" },
  { id: "portugal", slug: "portugal", label: "Portugal", symbol: "🇵🇹", suffix: "pt" },
  { id: "roumanie", slug: "romania", label: "Roumanie", symbol: "🇷🇴", suffix: "ro" },
  { id: "royaume-uni", slug: "united-kingdom", label: "Royaume-Uni", symbol: "🇬🇧", suffix: "uk" },
  { id: "senegal", slug: "senegal", label: "Sénégal", symbol: "🇸🇳", suffix: "sn" },
  { id: "suede", slug: "sweden", label: "Suède", symbol: "🇸🇪", suffix: "se" },
  { id: "suisse", slug: "switzerland", label: "Suisse", symbol: "🇨🇭", suffix: "ch" },
  { id: "tunisie", slug: "tunisia", label: "Tunisie", symbol: "🇹🇳", suffix: "tn" },
  { id: "turquie", slug: "turkey", label: "Turquie", symbol: "🇹🇷", suffix: "tr" },
  { id: "vietnam", slug: "vietnam", label: "Vietnam", symbol: "🇻🇳", suffix: "vn" },
] as const;

export type PageId = (typeof PAGES)[number]["id"];

export function isPageId(value: unknown): value is PageId {
  return PAGES.some((page) => page.id === value);
}

export function getPage(id: PageId) {
  return PAGES.find((page) => page.id === id)!;
}

export function pagePath(id: PageId) {
  return id === DEFAULT_PAGE_ID ? "/" : (`/${getPage(id).slug}` as const);
}

export function pageIdFromSlug(slug: string): PageId | null {
  // Existing French URLs remain valid entry points to the same stored page.
  return PAGES.find((page) => page.slug === slug || page.id === slug)?.id ?? null;
}

export function pageIdFromPath(pathname: string): PageId | null {
  if (pathname === "/") return DEFAULT_PAGE_ID;
  const slug = pathname.replace(/^\//, "").replace(/\/$/, "");
  return pageIdFromSlug(slug);
}

export function purchaseReturnPath(pageId: PageId, purchaseId: string) {
  return `${pagePath(pageId)}?purchase=${encodeURIComponent(purchaseId)}`;
}
