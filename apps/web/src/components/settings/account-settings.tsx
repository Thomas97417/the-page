import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import ChangePasswordCard from "./change-password-card";
import DeleteAccountCard from "./delete-account-card";
import SessionsCard from "./sessions-card";
import EmailCard from "./update-email-card";
import UpdateNameCard from "./update-name-card";

const sections = [
  { id: "profil", number: "01", label: "Votre profil" },
  { id: "securite", number: "02", label: "Sécurité" },
  { id: "sessions", number: "03", label: "Sessions" },
];

export function AccountSettings({ name, email }: { name: string; email: string }) {
  const displayName = name.trim() || "Mon espace";
  const initial = (name.trim() || email).charAt(0).toUpperCase();

  return (
    <main className="mx-auto w-full max-w-296 flex-1 px-5 pb-12 pt-8 sm:px-10 sm:pb-20 sm:pt-12 lg:px-14">
      <Link
        to="/"
        search={{}}
        className="group inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <ArrowLeft
          aria-hidden="true"
          className="size-3.5 transition-transform group-hover:-translate-x-1 motion-reduce:transform-none"
          strokeWidth={1.5}
        />
        <span>Retour à la page</span>
      </Link>

      <div className="border-b pb-9 pt-6 sm:pb-12 sm:pt-8">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Votre espace personnel
        </p>
        <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">
          Mon compte.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Vos informations personnelles et les accès à votre compte.
        </p>
      </div>

      <div className="grid gap-9 pt-7 sm:pt-10 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-20">
        <aside className="min-w-0 lg:sticky lg:top-10 lg:self-start">
          <div className="hidden min-w-0 lg:block">
            <div
              aria-hidden="true"
              className="mb-4 flex size-12 items-center justify-center rounded-full border font-serif text-2xl"
            >
              {initial}
            </div>
            <p className="break-words font-serif text-xl tracking-tight">
              {displayName}
            </p>
            <p className="mt-1 break-all text-xs leading-relaxed text-muted-foreground">
              {email}
            </p>
          </div>

          <nav
            aria-label="Rubriques du compte"
            className="flex flex-wrap gap-x-6 gap-y-1 border-b pb-5 lg:mt-8 lg:flex-col lg:gap-1 lg:border-0 lg:pb-0"
          >
            {sections.map(({ id, number, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="group flex min-h-11 items-center gap-3 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <span className="font-mono text-[10px]">{number}</span>
                <span className="underline-offset-4 group-hover:underline">
                  {label}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="ml-auto hidden size-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none lg:block"
                  strokeWidth={1.5}
                />
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <section
            id="profil"
            aria-labelledby="profil-heading"
            className="scroll-mt-8"
          >
            <SectionHeading id="profil-heading" number="01" title="Votre profil" />
            <UpdateNameCard name={name} />
            <EmailCard email={email} />
          </section>

          <section
            id="securite"
            aria-labelledby="securite-heading"
            className="scroll-mt-8 pt-10"
          >
            <SectionHeading id="securite-heading" number="02" title="Sécurité" />
            <ChangePasswordCard />
          </section>

          <section
            id="sessions"
            aria-labelledby="sessions-heading"
            className="scroll-mt-8 pt-10"
          >
            <SectionHeading id="sessions-heading" number="03" title="Sessions" />
            <SessionsCard />
          </section>

          <section aria-label="Suppression du compte" className="pt-3">
            <DeleteAccountCard />
          </section>
        </div>
      </div>
    </main>
  );
}

function SectionHeading({
  id,
  number,
  title,
}: {
  id: string;
  number: string;
  title: string;
}) {
  return (
    <h2
      id={id}
      className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
    >
      <span>{number}</span>
      <span aria-hidden="true" className="h-px w-5 bg-border" />
      {title}
    </h2>
  );
}
