import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

export default function Loader() {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex h-full items-center justify-center pt-8">
      <span className="sr-only">{t("common.loading")}</span>
      <Loader2 aria-hidden="true" className="animate-spin" />
    </div>
  );
}
