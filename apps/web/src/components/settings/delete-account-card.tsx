import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

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
  const navigate = useNavigate();

  const handleDelete = async () => {
    await authClient.deleteUser({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: "/" });
          location.reload();
        },
        onError: (error) => {
          toast.error(error.error.message);
        },
      },
    });
  };

  return (
    <SettingsCard className="border-0">
      <SettingsCardContent>
        <SettingsCardHeader
          title="Supprimer le compte"
          headingLevel={2}
          description="Votre accès au compte et à l’édition de vos mots sera supprimé. Cette action est définitive."
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
            Supprimer le compte
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-none p-6">
            <AlertDialogHeader className="place-items-start gap-3 text-left">
              <AlertDialogTitle className="text-balance font-serif text-2xl font-normal tracking-tight sm:text-3xl">
                Supprimer votre compte&nbsp;?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Votre accès au compte et à l’édition de vos mots sera supprimé.
                Cette action est définitive.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="-mx-6 -mb-6 mt-2 rounded-none bg-transparent p-6">
              <AlertDialogCancel className="h-11 px-4">Annuler</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                className="h-11 px-4"
                onClick={handleDelete}
              >
                Supprimer le compte
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingsCardFooter>
    </SettingsCard>
  );
}
