import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { formatLocale } from "@my-better-t-app/backend/convex/lib/language";
import { Button } from "../ui/button";
import { Loader2, Monitor, Smartphone, Globe, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
} from "./settings-card";
import { Skeleton } from "../ui/skeleton";
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

export default function SessionsCard() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const router = useRouter();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data } = await authClient.listSessions();
      return data;
    },
  });

  const { data: currentSession } = useQuery({
    queryKey: ["current-session"],
    queryFn: async () => {
      const { data } = await authClient.getSession();
      return data;
    },
  });

  const currentSessionId = currentSession?.session?.id;

  async function revokeSession(sessionId: string, sessionToken: string) {
    const isCurrent = sessionId === currentSessionId;
    setRevokingId(sessionToken);
    await authClient.revokeSession(
      { token: sessionToken },
      {
        onSuccess: () => {
          if (isCurrent) {
            router.navigate({ to: "/" });
            return;
          }
          toast.success(t("settings.sessionRevoked"));
          queryClient.invalidateQueries({ queryKey: ["sessions"] });
        },
        onError: (error) => {
          toast.error(errorMessage(error.error, t));
        },
      },
    );
    setRevokingId(null);
  }

  async function revokeOtherSessions() {
    setRevokingAll(true);
    const { error } = await authClient.revokeOtherSessions();
    if (error) {
      toast.error(errorMessage(error, t));
    } else {
      toast.success(t("settings.otherSessionsRevoked"));
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    }
    setRevokingAll(false);
  }

  function getDeviceIcon(userAgent: string | null | undefined) {
    if (!userAgent) return <Globe aria-hidden="true" className="size-4" strokeWidth={1.5} />;
    const ua = userAgent.toLowerCase();
    if (
      ua.includes("mobile") ||
      ua.includes("android") ||
      ua.includes("iphone")
    ) {
      return <Smartphone aria-hidden="true" className="size-4" strokeWidth={1.5} />;
    }
    return <Monitor aria-hidden="true" className="size-4" strokeWidth={1.5} />;
  }

  function getBrowserName(userAgent: string | null | undefined) {
    if (!userAgent) return t("settings.unknownBrowser");
    const ua = userAgent.toLowerCase();
    if (ua.includes("firefox")) return "Firefox";
    if (ua.includes("edg")) return "Edge";
    if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
    if (ua.includes("chrome")) return "Chrome";
    if (ua.includes("opera") || ua.includes("opr")) return "Opera";
    return t("settings.unknownBrowser");
  }

  const otherSessions = sessions?.filter((s) => s.id !== currentSessionId);

  return (
    <SettingsCard>
      <SettingsCardContent>
        <SettingsCardHeader
          title={t("settings.devices")}
          description={t("settings.devicesDescription")}
        />
        <div className="flex flex-col">
          {isLoading ? (
            <>
              <Skeleton className="my-2 h-16 w-full rounded-none" />
              <Skeleton className="my-2 h-16 w-full rounded-none" />
            </>
          ) : sessions?.length ? (
            sessions.map((session) => {
              const isCurrent = session.id === currentSessionId;
              return (
                <div
                  key={session.token}
                  className="flex items-center justify-between gap-3 border-b py-4 first:pt-1 last:border-0 last:pb-1"
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border text-muted-foreground">
                      {getDeviceIcon(session.userAgent)}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span>{getBrowserName(session.userAgent)}</span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                            <span aria-hidden="true" className="size-1 rounded-full bg-foreground" />
                            {t("settings.thisDevice")}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] leading-relaxed text-muted-foreground">
                        {t("settings.lastActive")}{" "}
                        {new Date(session.updatedAt).toLocaleDateString(
                          formatLocale(i18n.resolvedLanguage),
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </div>
                  </div>
                  {isCurrent ? (
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("settings.closeThisSession")}
                            className="size-11 text-muted-foreground hover:text-destructive"
                            disabled={revokingId === session.token}
                          />
                        }
                      >
                        {revokingId === session.token ? (
                          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                        ) : (
                          <X aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
                        )}
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-none p-6">
                        <AlertDialogHeader className="place-items-start gap-3 text-left">
                          <AlertDialogTitle className="text-balance font-serif text-2xl font-normal tracking-tight sm:text-3xl">
                            {t("settings.closeSessionTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("settings.signOutNotice")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="-mx-6 -mb-6 mt-2 rounded-none bg-transparent p-6">
                          <AlertDialogCancel className="h-11 px-4">{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            className="h-11 px-4"
                            onClick={() =>
                              revokeSession(session.id, session.token)
                            }
                          >
                            {t("common.signOut")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("settings.closeSession", { browser: getBrowserName(session.userAgent) })}
                      className="size-11 text-muted-foreground hover:text-destructive"
                      disabled={revokingId === session.token}
                      onClick={() => revokeSession(session.id, session.token)}
                    >
                      {revokingId === session.token ? (
                        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                      ) : (
                        <X aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
                      )}
                    </Button>
                  )}
                </div>
              );
            })
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              {t("settings.noSessions")}
            </p>
          )}
        </div>
      </SettingsCardContent>
      <SettingsCardFooter>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          {t("settings.sessionsNotice")}
        </p>
        <Button
          variant="outline"
          disabled={!otherSessions?.length || revokingAll}
          onClick={revokeOtherSessions}
        >
          {revokingAll ? t("settings.closing") : t("settings.closeOtherSessions")}
          {revokingAll ? (
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          ) : (
            <LogOut aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
          )}
        </Button>
      </SettingsCardFooter>
    </SettingsCard>
  );
}
