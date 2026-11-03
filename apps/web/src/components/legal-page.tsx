import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Footer } from "@/components/footer";

type LegalDocument = "notice" | "terms";
type LegalSection = {
  title: string;
  body: string;
  link?: { href: string; label: string };
};

const contact = { href: "mailto:contact@thepage.com", label: "contact@thepage.com" };

export function LegalPage({ document }: { document: LegalDocument }) {
  const { t } = useTranslation();
  const sections: Record<LegalDocument, LegalSection[]> = {
    notice: [
      {
        title: t("legal.notice.publisher.title"),
        body: t("legal.notice.publisher.body"),
        link: contact,
      },
      {
        title: t("legal.notice.hosting.title"),
        body: t("legal.notice.hosting.body"),
        link: { href: "https://www.cloudflare.com/website-terms/", label: "cloudflare.com" },
      },
      { title: t("legal.notice.data.title"), body: t("legal.notice.data.body") },
      { title: t("legal.notice.rights.title"), body: t("legal.notice.rights.body") },
    ],
    terms: [
      { title: t("legal.terms.service.title"), body: t("legal.terms.service.body") },
      { title: t("legal.terms.account.title"), body: t("legal.terms.account.body") },
      { title: t("legal.terms.places.title"), body: t("legal.terms.places.body") },
      { title: t("legal.terms.content.title"), body: t("legal.terms.content.body") },
      {
        title: t("legal.terms.availability.title"),
        body: t("legal.terms.availability.body"),
        link: contact,
      },
    ],
  };

  return (
    <>
      <main className="mx-auto w-full max-w-296 flex-1 px-5 pb-16 pt-8 sm:px-10 sm:pb-24 sm:pt-14 lg:px-14">
        <article className="mx-auto max-w-160">
          <Link
            to="/"
            search={{}}
            className="group mb-10 inline-flex min-h-10 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:mb-14"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-3.5 transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none"
              strokeWidth={1.5}
            />
            {t("common.backToPage")}
          </Link>

          <header className="pb-10 sm:pb-12">
            <h1 className="max-w-140 font-serif text-4xl leading-[1.1] tracking-[-0.04em] sm:text-5xl">
              {t(`legal.${document}.title`)}
            </h1>
            <p className="mt-5 max-w-120 text-sm leading-7 text-muted-foreground">
              {t(`legal.${document}.description`)}
            </p>
            <p className="mt-5 font-mono text-[10px] text-muted-foreground">
              <time dateTime="2026-11-03">{t("legal.updated")}</time>
            </p>
          </header>

          <div className="space-y-8 sm:space-y-10">
            {sections[document].map((section, index) => (
              <section key={index} aria-labelledby={`legal-section-${index}`} className="border-t pt-6">
                <div className="flex items-baseline gap-4 sm:gap-5">
                  <span aria-hidden="true" className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 id={`legal-section-${index}`} className="font-serif text-xl tracking-tight sm:text-2xl">
                    {section.title}
                  </h2>
                </div>
                <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground sm:pl-8">
                  {section.body.split("\n\n").map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-line">{paragraph}</p>
                  ))}
                  {section.link && (
                    <a
                      href={section.link.href}
                      className="inline-flex min-h-8 items-center gap-1.5 text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    >
                      {section.link.label}
                      <ArrowUpRight aria-hidden="true" className="size-3" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
