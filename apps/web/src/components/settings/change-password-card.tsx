import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";
import { ArrowUpRight, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
} from "./settings-card";

import PasswordInput from "../ui/password-input";

export default function ChangePasswordCard() {
  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Mot de passe modifié.");
        form.reset();
      }
    },
    validators: {
      onSubmit: z
        .object({
          currentPassword: z
            .string()
            .min(1, "Saisissez votre mot de passe actuel."),
          newPassword: z.string().min(8, "8 caractères minimum."),
          confirmPassword: z.string(),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: "Les mots de passe ne correspondent pas.",
          path: ["confirmPassword"],
        }),
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <SettingsCard>
        <SettingsCardContent>
          <SettingsCardHeader
            title="Mot de passe"
            description="Choisissez un mot de passe d’au moins 8 caractères."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <form.Field
              name="currentPassword"
              children={(field) => (
                <div className="flex flex-col gap-2.5 sm:col-span-2">
                  <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                  <PasswordInput
                    id="currentPassword"
                    placeholder="Mot de passe actuel"
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="[&_input]:h-12 [&_input]:rounded-none [&_input]:pl-3.5 [&_input]:text-base md:[&_input]:text-sm"
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      key={error?.message}
                      role="alert"
                      className="text-xs text-destructive"
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            />
            <form.Field
              name="newPassword"
              children={(field) => (
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <PasswordInput
                    id="newPassword"
                    placeholder="Nouveau mot de passe"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="[&_input]:h-12 [&_input]:rounded-none [&_input]:pl-3.5 [&_input]:text-base md:[&_input]:text-sm"
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      key={error?.message}
                      role="alert"
                      className="text-xs text-destructive"
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            />
            <form.Field
              name="confirmPassword"
              children={(field) => (
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="confirmPassword">
                    Confirmer le mot de passe
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Confirmer le mot de passe"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="[&_input]:h-12 [&_input]:rounded-none [&_input]:pl-3.5 [&_input]:text-base md:[&_input]:text-sm"
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      key={error?.message}
                      role="alert"
                      className="text-xs text-destructive"
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            />
          </div>
        </SettingsCardContent>
        <SettingsCardFooter>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            Les autres sessions seront fermées après modification.
          </p>
          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                variant="outline"
                disabled={!state.canSubmit || state.isSubmitting}
              >
                {state.isSubmitting ? "Enregistrement…" : "Enregistrer"}
                {state.isSubmitting ? (
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3.5"
                    strokeWidth={1.5}
                  />
                )}
              </Button>
            )}
          </form.Subscribe>
        </SettingsCardFooter>
      </SettingsCard>
    </form>
  );
}
