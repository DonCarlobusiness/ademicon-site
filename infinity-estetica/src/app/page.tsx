import { AreasIndex } from "@/components/areas-index";
import { DemoDialogProvider } from "@/components/demo-dialog";
import { FinalConversation } from "@/components/final-conversation";
import { Hero } from "@/components/hero";
import { LocalPresence } from "@/components/local-presence";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <DemoDialogProvider>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-umber focus:px-5 focus:py-3 focus:text-ivory"
      >
        Pular para o conteúdo
      </a>
      <div className="overflow-x-clip">
        <SiteHeader />
        <main id="conteudo" tabIndex={-1} className="outline-none">
          <Hero />
          <AreasIndex />
          <LocalPresence />
          <FinalConversation />
        </main>
        <SiteFooter />
      </div>
    </DemoDialogProvider>
  );
}
