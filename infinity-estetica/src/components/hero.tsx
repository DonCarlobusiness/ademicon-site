import { Arrow, ConversationButton } from "./demo-dialog";
import { SignatureDesktop, SignatureMobile } from "./signature-curves";

export function Hero() {
  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="relative mx-auto max-w-[90rem] px-5 xs:px-6 md:px-10 xl:px-16"
    >
      <div className="grid lg:min-h-[min(46rem,calc(100svh-6.5rem))] lg:grid-cols-12 lg:gap-x-8">
        {/* Editorial column */}
        <div className="relative z-10 pt-12 xs:pt-14 md:pt-24 lg:col-span-6 lg:flex lg:flex-col lg:justify-center lg:pt-10 lg:pb-16 xl:col-span-6">
          <p className="eyebrow reveal flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-ochre" />
            Luís Eduardo Magalhães · BA
          </p>

          <h1
            id="hero-title"
            className="display reveal mt-6 text-[2.5rem] leading-[1.04] xs:text-[2.75rem] md:mt-8 md:text-[4.5rem] md:leading-[1] lg:text-[clamp(3.5rem,5.3vw,5.25rem)]"
            style={{ ["--delay" as string]: "60ms" }}
          >
            <span className="block">Estética avançada.</span>
            <span className="block">
              Comece pela <br className="md:hidden" />
              <em className="italic">conversa.</em>
            </span>
          </h1>

          <p
            className="reveal mt-6 max-w-[26rem] text-muted md:mt-8 md:max-w-[30rem] md:text-[1.125rem]"
            style={{ ["--delay" as string]: "120ms" }}
          >
            Facial, corporal e capilar. Conheça as áreas em destaque e converse sobre
            agendamento.
          </p>

          <div
            className="reveal mt-8 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-6 md:mt-10"
            style={{ ["--delay" as string]: "180ms" }}
          >
            <ConversationButton className="btn-primary">
              Conversar pelo WhatsApp
              <Arrow />
            </ConversationButton>
            <a href="#areas" className="link-quiet">
              Conhecer as áreas
            </a>
          </div>
        </div>

        {/* Visual field — mobile/tablet: its own vertical composition, after the CTA */}
        <div
          aria-hidden="true"
          className="field-surface relative -mx-5 mt-16 h-[27rem] [clip-path:inset(-12rem_0_0_0)] xs:-mx-6 xs:h-[29rem] md:-mx-10 md:mt-16 md:h-[34rem] lg:hidden"
        >
          <SignatureMobile className="absolute top-2 -left-[4%] h-[calc(100%+2rem)] w-[122%] md:left-[18%] md:w-[70%]" />
        </div>

        {/* Visual field — desktop: bleeds to the right edge */}
        <div
          aria-hidden="true"
          className="relative hidden lg:col-span-6 lg:-mr-10 lg:block xl:-mr-16"
        >
          <div className="field-surface absolute inset-y-0 right-0 left-[8%] -top-[6.5rem] [clip-path:inset(0_0_0_-40vw)]">
            <SignatureDesktop className="absolute top-[12%] left-[14%] h-[78%] w-auto xl:top-0 xl:left-0 xl:h-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
