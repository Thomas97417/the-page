import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
} from "./settings-card";
import { Label } from "../ui/label";
import { useForm } from "@tanstack/react-form";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import z from "zod";
import { Button } from "../ui/button";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function UpdateEmailCard({ email }: { email: string }) {
  const { t } = useTranslation();
  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data } = await authClient.listAccounts();
      return data;
    },
  });
  const isSocialOnly =
    accounts !== undefined &&
    accounts !== null &&
    !accounts.some((account) => account.providerId === "credential");

  const form = useForm({
    defaultValues: { newEmail: email },
    onSubmit: async ({ value }) => {
      await authClient.changeEmail(
        { newEmail: value.newEmail },
        {
          onSuccess: () => {
            toast.success(t("settings.emailChanged"));
          },
          onError: (error) => {
            toast.error(errorMessage(error.error, t));
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        newEmail: z.string().email("INVALID_EMAIL"),
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
            title={t("settings.emailTitle")}
            description={t("settings.emailDescription")}
          />
          <form.Field
            name="newEmail"
            children={(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor="newEmail" className="sr-only">
                  {t("common.email")}
                </Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder={t("common.yourEmail")}
                  autoComplete="email"
                  required
                  disabled={isSocialOnly}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                  aria-describedby={
                    field.state.meta.errors.length ? "email-error" : undefined
                  }
                  className="h-12 rounded-none bg-transparent px-3.5 text-base md:text-sm"
                />
                {field.state.meta.errors.length > 0 && (
                  <p
                    id="email-error"
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {field.state.meta.errors
                      .map((error) => errorMessage(error?.message, t))
                      .join(" ")}
                  </p>
                )}
              </div>
            )}
          />
        </SettingsCardContent>
        <SettingsCardFooter>
          {isSocialOnly && (
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              {t("settings.socialEmail")}
            </p>
          )}
          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                variant="outline"
                disabled={
                  isSocialOnly || !state.canSubmit || state.isSubmitting
                }
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
