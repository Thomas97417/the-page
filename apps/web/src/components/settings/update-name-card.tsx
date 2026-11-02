import { useTranslation } from "react-i18next";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
} from "./settings-card";
import { Label } from "../ui/label";
import { ArrowUpRight, Loader2 } from "lucide-react";

export default function UpdateNameCard({ name }: { name: string }) {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { name },
    onSubmit: async ({ value }) => {
      await authClient.updateUser(
        { name: value.name },
        {
          onSuccess: () => {
            toast.success(t("settings.nameChanged"));
          },
          onError: (error) => {
            toast.error(errorMessage(error.error, t));
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "NAME_TOO_SHORT"),
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
            title={t("common.yourName")}
            description={t("settings.nameDescription")}
          />
          <form.Field
            name="name"
            children={(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="sr-only">
                  {t("common.name")}
                </Label>
                <Input
                  id="name"
                  placeholder={t("common.name")}
                  autoComplete="name"
                  required
                  minLength={2}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                  aria-describedby={
                    field.state.meta.errors.length ? "name-error" : undefined
                  }
                  className="h-12 rounded-none bg-transparent px-3.5 text-base md:text-sm"
                />
                {field.state.meta.errors.length > 0 && (
                  <p
                    id="name-error"
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
