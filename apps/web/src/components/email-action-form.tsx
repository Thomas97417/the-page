import { useTranslation } from "react-i18next";
import { useState, type FormEvent } from "react";
import { Loader2, ArrowUpRight, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { returnPath } from "@/lib/page";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { errorMessage } from "@/lib/errors";

export default function EmailActionForm({
  verify = false,
}: {
  verify?: boolean;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = verify
        ? await authClient.sendVerificationEmail({
            email,
            callbackURL: returnPath(),
          })
        : await authClient.requestPasswordReset({
            email,
            redirectTo: "/reset-password",
          });
      if (result.error) setError(result.error);
      else setSent(true);
    } catch {
      setError("AUTH_ERROR");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto my-auto w-full max-w-md px-6 py-16 sm:py-22">
      {sent ? (
        <div>
          <MailCheck className="mb-6 size-8 text-primary" />
          <h1 className="font-serif text-4xl tracking-tight">
            {t("auth.checkEmail")}
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {t("auth.emailSent")}
          </p>
        </div>
      ) : (
        <>
          <h1 className="font-serif text-4xl tracking-tight">
            {verify ? t("auth.verifyEmail") : t("auth.forgotPassword")}
          </h1>
          <form className="mt-8 space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="request-email">{t("common.email")}</Label>
              <Input
                className="h-12"
                id="request-email"
                type="email"
                placeholder={t("common.yourEmail")}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error != null && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(error, t)}
              </p>
            )}
            <Button
              className="h-12 w-full justify-between px-4 text-sm"
              type="submit"
              disabled={busy}
            >
              {t("auth.sendLink")}
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUpRight className="size-4" />
              )}
            </Button>
          </form>
        </>
      )}
    </main>
  );
}
