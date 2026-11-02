import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageFallback } from "./page-fallback";
import { buttonVariants } from "./ui/button";

export default function NotFound() {
  return (
    <PageFallback
      marker="404"
      label="Page introuvable"
      title={
        <>
          Une page
          <br />
          <span className="italic">s’est égarée.</span>
        </>
      }
      description="Cette page n’existe pas ou le lien a changé. Retrouvez notre histoire et reprenez le fil."
      actions={
        <Link
          to="/"
          className={cn(buttonVariants(), "h-12 gap-8 px-6 text-sm")}
        >
          Retour à la page
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      }
    />
  );
}
