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
import z from "zod";
import { Button } from "../ui/button";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function UpdateEmailCard({ email }: { email: string }) {
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
            toast.success("Email modifié.");
          },
          onError: (error) => {
            toast.error(error.error.message);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        newEmail: z.string().email("Adresse email invalide"),
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
            title="Adresse email"
            description="L’adresse utilisée pour vous connecter et recevoir nos emails."
          />
          <form.Field
            name="newEmail"
            children={(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor="newEmail" className="sr-only">
                  Email
                </Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="Votre adresse email"
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
                      .map((error) => error?.message)
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
              Email géré par votre fournisseur de connexion.
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
