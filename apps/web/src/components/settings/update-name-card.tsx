import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
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
  const form = useForm({
    defaultValues: { name },
    onSubmit: async ({ value }) => {
      await authClient.updateUser(
        { name: value.name },
        {
          onSuccess: () => {
            toast.success("Nom modifié.");
          },
          onError: (error) => {
            toast.error(error.error.message);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
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
            title="Votre nom"
            description="Le nom associé à votre compte."
          />
          <form.Field
            name="name"
            children={(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="sr-only">
                  Nom
                </Label>
                <Input
                  id="name"
                  placeholder="Nom"
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
                      .map((error) => error?.message)
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
