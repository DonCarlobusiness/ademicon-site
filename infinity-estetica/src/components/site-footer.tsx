import { studio } from "@/content/site";
import { Wordmark } from "./site-header";

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-[90rem] px-5 xs:px-6 md:px-10 xl:px-16">
      <div className="flex flex-col gap-6 border-t border-rule py-8 text-[0.8125rem] text-muted md:flex-row md:items-end md:justify-between md:py-10">
        <Wordmark />
        <div className="flex flex-col gap-1 md:items-end md:text-right">
          <p>Conceito não oficial. Não aprovado pela Infinity Estética Avançada.</p>
          <p>{studio.footerLine}</p>
        </div>
      </div>
    </footer>
  );
}
