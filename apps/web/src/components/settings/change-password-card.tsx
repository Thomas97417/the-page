import { useTranslation } from "react-i18next";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
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
  const { t } = useTranslation();
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
        toast.error(errorMessage(error, t));
      } else {
        toast.success(t("auth.passwordChanged"));
        form.reset();
      }
    },
    validators: {
      onSubmit: z
        .object({
          currentPassword: z
            .string()
            .min(1, "PASSWORD_REQUIRED"),
          newPassword: z.string().min(8, "PASSWORD_TOO_SHORT"),
          confirmPassword: z.string(),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: "PASSWORD_MISMATCH",
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
            title={t("common.password")}
            description={t("settings.passwordDescription")}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <form.Field
              name="currentPassword"
              children={(field) => (
                <div className="flex flex-col gap-2.5 sm:col-span-2">
                  <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
                  <PasswordInput
                    id="currentPassword"
                    placeholder={t("settings.currentPassword")}
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
                      {errorMessage(error?.message, t)}
                    </p>
                  ))}
                </div>
              )}
            />
            <form.Field
              name="newPassword"
              children={(field) => (
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="newPassword">{t("auth.newPassword")}</Label>
                  <PasswordInput
                    id="newPassword"
                    placeholder={t("auth.newPassword")}
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
                      {errorMessage(error?.message, t)}
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
                    {t("settings.confirmPassword")}
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder={t("settings.confirmPassword")}
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
                      {errorMessage(error?.message, t)}
                    </p>
                  ))}
                </div>
              )}
            />
          </div>
        </SettingsCardContent>
        <SettingsCardFooter>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            {t("settings.revokeNotice")}
          </p>
          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                variant="outline"
                disabled={!state.canSubmit || state.isSubmitting}
              >
                {state.isSubmitting ? t("common.saving") : t("common.save")}
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
