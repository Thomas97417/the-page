import { useId, type ReactNode } from "react";

type PageFallbackProps = {
  marker: string;
  label: string;
  title: ReactNode;
  description: string;
  actions: ReactNode;
  children?: ReactNode;
};

export function PageFallback({
  marker,
  label,
  title,
  description,
  actions,
  children,
}: PageFallbackProps) {
  const titleId = useId();

  return (
    <main
      aria-labelledby={titleId}
      className="mx-auto flex w-full max-w-296 flex-1 flex-col px-5 sm:px-10 lg:px-14"
    >
      <section className="my-auto flex flex-col items-center py-8 text-center">
        <div
          aria-hidden="true"
          className="mb-6 flex w-full max-w-64 items-center gap-6 select-none"
        >
          <span className="h-px flex-1 bg-border" />
          <span className="font-serif text-6xl leading-none tracking-[-0.06em] text-muted-foreground/60">
            {marker}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
        <h1
          id={titleId}
          className="mt-4 font-serif text-[clamp(2.5rem,6vw,3.75rem)] leading-[1.08] tracking-[-0.045em]"
        >
          {title}
        </h1>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-7 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
          {actions}
        </div>
        {children}
      </section>

      <footer className="border-t py-6 text-center">
        <p className="font-serif text-sm italic text-muted-foreground">
          Une page à tous. Un mot de vous.
        </p>
      </footer>
    </main>
  );
}
