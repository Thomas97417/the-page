import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";

import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
} from "./settings-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";

export default function DeleteAccountCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleDelete = async () => {
    await authClient.deleteUser({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: "/" });
          location.reload();
        },
        onError: (error) => {
          toast.error(errorMessage(error.error, t));
        },
      },
    });
  };

  return (
    <SettingsCard className="border-0">
      <SettingsCardContent>
        <SettingsCardHeader
          title={t("settings.delete")}
          headingLevel={2}
          description={t("settings.deleteDescription")}
        />
      </SettingsCardContent>
      <SettingsCardFooter>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="outline"
                className="border-destructive/25 text-destructive hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
              />
            }
          >
            {t("settings.delete")}
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-none p-6">
            <AlertDialogHeader className="place-items-start gap-3 text-left">
              <AlertDialogTitle className="text-balance font-serif text-2xl font-normal tracking-tight sm:text-3xl">
                {t("settings.deleteTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("settings.deleteDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="-mx-6 -mb-6 mt-2 rounded-none bg-transparent p-6">
              <AlertDialogCancel className="h-11 px-4">{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                className="h-11 px-4"
                onClick={handleDelete}
              >
                {t("settings.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingsCardFooter>
    </SettingsCard>
  );
}
