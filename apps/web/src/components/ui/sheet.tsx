import { useTranslation } from "react-i18next";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

export function SheetContent({
  children,
  className,
  ...props
}: Dialog.Popup.Props) {
  const { t } = useTranslation();
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[2px] transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0" />
      <Dialog.Popup
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto border-l bg-background px-6 py-7 shadow-2xl outline-none transition-transform duration-200 data-starting-style:translate-x-full data-ending-style:translate-x-full sm:px-10 sm:py-10 motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        <Dialog.Close
          aria-label={t("common.closePanel")}
          className="absolute right-5 top-5 flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          <X className="size-5" />
        </Dialog.Close>
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  );
}
