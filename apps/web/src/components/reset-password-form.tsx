import { useTranslation } from "react-i18next";
import { useState, type FormEvent } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { Loader2, ArrowUpRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { errorMessage } from "@/lib/errors";

export default function ResetPasswordForm() {
  const { t } = useTranslation();
  const { token } = useSearch({ from: "/(auth)/reset-password" });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("PASSWORD_MISMATCH");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) setError(result.error);
      else setDone(true);
    } catch {
      setError("AUTH_ERROR");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto my-auto w-full max-w-md px-6 py-16 sm:py-22">
      <h1 className="font-serif text-4xl tracking-tight">
        {done
          ? t("auth.passwordChanged")
          : token
            ? t("auth.resetTitle")
            : t("auth.expiredLink")}
      </h1>
      {done ? (
        <Link
          to="/sign-in"
          className="mt-8 inline-block text-sm underline underline-offset-4"
        >
          {t("common.signIn")}
        </Link>
      ) : !token ? (
        <Link
          to="/forgot-password"
          className="mt-8 inline-block text-sm underline underline-offset-4"
        >
          {t("auth.newLink")}
        </Link>
      ) : (
        <form className="mt-9 space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
            <Input
              className="h-12"
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t("auth.confirm")}</Label>
            <Input
              className="h-12"
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
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
            {t("common.save")}
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
          </Button>
        </form>
      )}
    </main>
  );
}
