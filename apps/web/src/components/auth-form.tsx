import { useTranslation } from "react-i18next";
import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { returnPath } from "@/lib/page";
import { errorMessage } from "@/lib/errors";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import PasswordInput from "./ui/password-input";
import { GoogleLoginButton, GitHubLoginButton } from "./social-login-buttons";

export default function AuthForm({ signup = false }: { signup?: boolean }) {
  const { t } = useTranslation();
  const providers = useQuery(api.auth.providers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code?: string } | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = signup
        ? await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL: returnPath(),
          })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }
      window.location.assign(
        signup && !result.data?.token ? "/verify-email" : returnPath(),
      );
    } catch {
      setError({ code: "AUTH_ERROR" });
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto my-auto w-full max-w-md px-6 py-16 sm:py-22">
      <h1 className="font-serif text-5xl tracking-tight">
        {signup ? t("auth.signUpTitle") : t("auth.signInTitle")}
      </h1>
      <form onSubmit={submit} className="mt-9 space-y-5">
        {signup && (
          <div className="space-y-2">
            <Label htmlFor="auth-name">{t("common.name")}</Label>
            <Input
              id="auth-name"
              placeholder={t("common.yourName")}
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="auth-email">{t("common.email")}</Label>
          <Input
            id="auth-email"
            type="email"
            placeholder={t("common.yourEmail")}
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="auth-password">{t("common.password")}</Label>
            {!signup && (
              <Link
                to="/forgot-password"
                className="text-xs text-muted-foreground hover:underline"
              >
                {t("auth.forgot")}
              </Link>
            )}
          </div>
          <PasswordInput
            id="auth-password"
            placeholder={signup ? t("auth.passwordMinimum") : t("auth.yourPassword")}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onBlur={() => {}}
            onChange={(e) => setPassword(e.target.value)}
            className="[&_input]:h-12"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(error, t)}
            {error.code === "EMAIL_NOT_VERIFIED" && (
              <Link to="/verify-email" className="ml-1 underline">
                {t("auth.resend")}
              </Link>
            )}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy || password.length < 8}
          className="h-12 w-full justify-between px-4 text-sm"
        >
          {signup ? t("auth.createAccount") : t("common.signIn")}
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUpRight className="size-4" />
          )}
        </Button>
      </form>
      {(providers?.google || providers?.github) && (
        <>
          <div className="my-7 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("auth.or")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-3 [&_button]:h-11">
            {providers?.google && <GoogleLoginButton />}
            {providers?.github && <GitHubLoginButton />}
          </div>
        </>
      )}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        {signup ? t("auth.hasAccount") : t("auth.firstVisit")}{" "}
        <Link
          to={signup ? "/sign-in" : "/sign-up"}
          className="ml-1 text-foreground underline underline-offset-4"
        >
          {signup ? t("common.signIn") : t("auth.signUp")}
        </Link>
      </p>
    </main>
  );
}
