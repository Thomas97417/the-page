import { cn } from "@/lib/utils";

export function SettingsCard({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-5 border-b py-7 sm:py-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SettingsCardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-5", className)}>
      {children}
    </div>
  );
}

export function SettingsCardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-4 [&_button]:ml-auto [&_button]:h-11 [&_button]:gap-3 [&_button]:px-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsCardHeader({
  title,
  description,
  headingLevel = 3,
}: {
  title: string;
  description?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <div className="flex flex-col gap-2">
      <Heading className="font-serif text-2xl tracking-tight sm:text-[1.625rem]">
        {title}
      </Heading>
      {description && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
