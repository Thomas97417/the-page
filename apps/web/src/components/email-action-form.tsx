import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, ArrowUpRight, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { returnPath } from "@/lib/page";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { authError } from "./auth-form";

export default function EmailActionForm({
  verify = false,
}: {
  verify?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
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
      if (result.error) setError(authError(result.error.code));
      else setSent(true);
    } catch {
      setError(authError());
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto w-full max-w-md px-6 py-16 sm:py-22">
      <Link
        to="/sign-in"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Connexion
      </Link>
      {sent ? (
        <div className="mt-12">
          <MailCheck className="mb-6 size-8 text-primary" />
          <h1 className="font-serif text-4xl tracking-tight">
            Regardez vos emails.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Si un compte correspond à cette adresse, un lien vous a été envoyé.
          </p>
        </div>
      ) : (
        <>
          <h1 className="mt-9 font-serif text-4xl tracking-tight">
            {verify ? "Vérifiez votre email." : "Mot de passe oublié ?"}
          </h1>
          <form className="mt-8 space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="request-email">Email</Label>
              <Input
                className="h-12"
                id="request-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              className="h-12 w-full justify-between px-4 text-sm"
              type="submit"
              disabled={busy}
            >
              Envoyer le lien
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
