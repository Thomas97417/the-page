import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { DEFAULT_PAGE_ID, isPageId, pageIdFromPath, type PageId } from "@my-better-t-app/backend/convex/lib/pages";
import { rememberReturnPath } from "@/lib/page";
import { BuySheet } from "./purchase-sheet";
import { MyWords } from "./my-words";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./ui/sheet";

export type WordDraft = {
  slotId: Id<"slots">;
  pageId?: PageId;
  position: number;
  acquisition: number;
  word: string;
  url: string;
  description?: string;
};
type PageContextValue = {
  buy: (draft: WordDraft) => void;
  showWords: () => void;
  showRules: () => void;
};
const PageContext = createContext<PageContextValue | null>(null);
const DRAFT_KEY = "the-page:draft";

export function saveDraft(draft: WordDraft) {
  rememberReturnPath(draft.pageId ?? DEFAULT_PAGE_ID);
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* Storage can be disabled. */
  }
}

export function PageProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<WordDraft | null>(null);
  const [wordsOpen, setWordsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const { pathname } = useLocation();
  const { isAuthenticated } = useConvexAuth();
  useEffect(() => {
    const pageId = pageIdFromPath(pathname);
    if (!pageId) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (
        saved &&
        typeof saved.slotId === "string" &&
        (saved.pageId === undefined || isPageId(saved.pageId)) &&
        typeof saved.word === "string" &&
        typeof saved.url === "string" &&
        (saved.description === undefined ||
          typeof saved.description === "string") &&
        Number.isInteger(saved.position) &&
        Number.isInteger(saved.acquisition)
      ) {
        // A draft belongs to its page, including after an auth redirect.
        if ((saved.pageId ?? DEFAULT_PAGE_ID) !== pageId) return;
        setDraft({ ...saved, pageId });
      }
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* Ignore an invalid or unavailable local draft. */
    }
  }, [pathname, isAuthenticated]);
  return (
    <PageContext.Provider
      value={{
        buy: setDraft,
        showWords: () => setWordsOpen(true),
        showRules: () => setRulesOpen(true),
      }}
    >
      {children}
      {draft && (
        <BuySheet
          key={draft.slotId}
          draft={draft}
          onClose={() => setDraft(null)}
        />
      )}
      {wordsOpen && isAuthenticated && (
        <MyWords onClose={() => setWordsOpen(false)} />
      )}
      <Sheet open={rulesOpen} onOpenChange={setRulesOpen}>
        <SheetContent>
          <SheetTitle className="mt-14 font-serif text-4xl tracking-tight">
            Comment ça marche ?
          </SheetTitle>
          <SheetDescription className="mt-6 text-base leading-relaxed text-muted-foreground">
            Une page World et des pages par pays. 50 emplacements par page.
            Un mot par place.
          </SheetDescription>
          <ol className="mt-10 space-y-8 text-base leading-relaxed">
            <li>
              <span className="mb-2 block font-mono text-xs text-primary">
                01
              </span>
              Choisissez une place et écrivez votre mot. Ajoutez une description
              et un lien si vous le souhaitez. Chaque page est indépendante ;
              vous pouvez participer à celle de votre choix.
            </li>
            <li>
              <span className="mb-2 block font-mono text-xs text-primary">
                02
              </span>
              Chaque place commence à 1 €. Son prix augmente de 1 € à chaque
              achat.
            </li>
            <li>
              <span className="mb-2 block font-mono text-xs text-primary">
                03
              </span>
              Un nouvel achat remplace votre mot, sans compensation. Tant que
              vous avez la place, vous pouvez le modifier gratuitement.
            </li>
          </ol>
          <p className="mt-10 border-t pt-6 text-sm leading-relaxed text-muted-foreground">
            Aucune durée ni audience garantie. Les paiements reviennent à the
            page. Les contenus abusifs peuvent être retirés.
          </p>
        </SheetContent>
      </Sheet>
    </PageContext.Provider>
  );
}

export function usePage() {
  const context = useContext(PageContext);
  if (!context) throw new Error("PageProvider missing");
  return context;
}
