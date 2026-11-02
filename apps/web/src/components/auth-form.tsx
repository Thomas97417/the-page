import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { returnPath } from "@/lib/page";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import PasswordInput from "./ui/password-input";
import { GoogleLoginButton, GitHubLoginButton } from "./social-login-buttons";

export function authError(code?: string) {
  const messages: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
    EMAIL_NOT_VERIFIED: "Vérifiez votre email avant de vous connecter.",
    USER_ALREADY_EXISTS: "Un compte existe déjà avec cet email.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
      "Un compte existe déjà avec cet email.",
    PASSWORD_TOO_SHORT: "Le mot de passe doit contenir au moins 8 caractères.",
    INVALID_TOKEN: "Ce lien est invalide ou a expiré.",
  };
  return (
    messages[code ?? ""] ?? "Impossible de terminer cette demande. Réessayez."
  );
}

export default function AuthForm({ signup = false }: { signup?: boolean }) {
  const providers = useQuery(api.auth.providers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
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
        setError(authError(result.error.code));
        setBusy(false);
        return;
      }
      window.location.assign(
        signup && !result.data?.token ? "/verify-email" : returnPath(),
      );
    } catch {
      setError(authError());
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto w-full max-w-md px-6 py-16 sm:py-22">
      <Link
        to="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← La page
      </Link>
      <h1 className="mt-9 font-serif text-5xl tracking-tight">
        {signup ? "Votre première place." : "De retour."}
      </h1>
      <form onSubmit={submit} className="mt-9 space-y-5">
        {signup && (
          <div className="space-y-2">
            <Label htmlFor="auth-name">Nom</Label>
            <Input
              id="auth-name"
              placeholder="Votre nom"
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
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            placeholder="Votre adresse email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="auth-password">Mot de passe</Label>
            {!signup && (
              <Link
                to="/forgot-password"
                className="text-xs text-muted-foreground hover:underline"
              >
                Oublié ?
              </Link>
            )}
          </div>
          <PasswordInput
            id="auth-password"
            placeholder={signup ? "8 caractères minimum" : "Votre mot de passe"}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onBlur={() => {}}
            onChange={(e) => setPassword(e.target.value)}
            className="[&_input]:h-12"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
            {error.includes("Vérifiez") && (
              <Link to="/verify-email" className="ml-1 underline">
                Renvoyer le lien
              </Link>
            )}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy || password.length < 8}
          className="h-12 w-full justify-between px-4 text-sm"
        >
          {signup ? "Créer mon compte" : "Se connecter"}
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
            <span className="text-xs text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-3 [&_button]:h-11">
            {providers?.google && <GoogleLoginButton />}
            {providers?.github && <GitHubLoginButton />}
          </div>
        </>
      )}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        {signup ? "Déjà un compte ?" : "Première visite ?"}{" "}
        <Link
          to={signup ? "/sign-in" : "/sign-up"}
          className="ml-1 text-foreground underline underline-offset-4"
        >
          {signup ? "Se connecter" : "Créer un compte"}
        </Link>
      </p>
    </main>
  );
}
