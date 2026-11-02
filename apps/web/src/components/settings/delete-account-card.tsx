import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

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
  AlertDialogMedia,
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
    <SettingsCard className="border-destructive">
      <SettingsCardContent>
        <SettingsCardHeader title="Supprimer le compte" description="" />
      </SettingsCardContent>
      <SettingsCardFooter className="bg-destructive/10 dark:bg-destructive/10">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                size="sm"
                variant="destructive"
                className="hover:cursor-pointer"
              />
            }
          >
            Supprimer le compte
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <TriangleAlert className="size-5" />
              </AlertDialogMedia>
              <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
              <AlertDialogDescription>
                Votre accès au compte et à l’édition de vos mots sera supprimé.
                Cette action est définitive.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleDelete}>
                Supprimer le compte
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingsCardFooter>
    </SettingsCard>
  );
}
