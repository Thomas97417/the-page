import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowUpRight, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageFallback } from "./page-fallback";
import { Button, buttonVariants } from "./ui/button";

export default function ErrorBoundary({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  async function retry() {
    setIsRetrying(true);
    setRetryFailed(false);

    try {
      await router.invalidate();
      reset();
    } catch {
      setRetryFailed(true);
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <PageFallback
      marker="…"
      label={t("fallback.error")}
      title={
        <>
          {t("fallback.errorTitle")}
          <br />
          <span className="italic">{t("fallback.errorEmphasis")}</span>
        </>
      }
      description={t("fallback.errorDescription")}
      actions={
        <>
          <Button
            type="button"
            disabled={isRetrying}
            aria-busy={isRetrying}
            className="h-12 gap-8 px-6 text-sm"
            onClick={retry}
          >
            {isRetrying ? t("common.loading") : t("common.retry")}
            {isRetrying ? (
              <Loader2
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <RotateCcw aria-hidden="true" className="size-4" />
            )}
          </Button>
          <Link
            to="/"
            reloadDocument
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-12 gap-8 px-6 text-sm",
            )}
          >
            {t("common.backToPage")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </>
      }
    >
      {retryFailed && (
        <p role="status" className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t("fallback.retryFailed")}
        </p>
      )}
      {import.meta.env.DEV && error instanceof Error && (
        <details className="mt-9 w-full max-w-lg border-t pt-4 text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            {t("fallback.details")}
          </summary>
          <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap break-words border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-destructive">
            {error.message}
          </pre>
        </details>
      )}
    </PageFallback>
  );
}
