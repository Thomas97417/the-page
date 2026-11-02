import { useTranslation } from "react-i18next";
import { DESCRIPTION_MAX_LENGTH } from "@my-better-t-app/backend/convex/lib/content";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

export function WordDescriptionField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const length = Array.from(value.normalize("NFC").trim()).length;
  const tooLong = length > DESCRIPTION_MAX_LENGTH;

  return (
    <div className="space-y-2.5">
      <Label htmlFor={id}>
        {t("word.about")}{" "}
        <span className="font-normal text-muted-foreground">{t("common.optional")}</span>
      </Label>
      <textarea
        id={id}
        rows={3}
        placeholder={t("word.descriptionPlaceholder")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={`${id}-hint ${id}-count`}
        aria-invalid={tooLong || undefined}
        className="w-full min-w-0 resize-y rounded-sm border border-input bg-transparent px-3 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 md:text-sm"
      />
      <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
        <p id={`${id}-hint`}>{t("word.descriptionHint")}</p>
        <span
          id={`${id}-count`}
          className={cn("shrink-0 font-mono", tooLong && "text-destructive")}
        >
          {length}/{DESCRIPTION_MAX_LENGTH}
          <span className="sr-only"> {t("word.characters")}</span>
        </span>
      </div>
    </div>
  );
}
