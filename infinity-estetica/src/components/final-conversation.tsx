import { Arrow, ConversationButton } from "./demo-dialog";
import { SectionMarker } from "./section-marker";
import { SignatureFragment } from "./signature-curves";

export function FinalConversation() {
  return (
    <section
      id="conversa"
      aria-labelledby="conversa-title"
      className="relative overflow-hidden"
    >
      <div className="relative mx-auto max-w-[90rem] px-5 pt-20 pb-24 xs:px-6 md:px-10 md:pt-32 md:pb-36 xl:px-16">
        <div className="grid lg:grid-cols-12 lg:gap-x-8">
          <div className="relative z-10 lg:col-span-8 lg:col-start-5">
            <SectionMarker index="03" label="Conversa" />
            <h2
              id="conversa-title"
              className="display mt-6 text-[2.5rem] xs:text-[2.75rem] md:text-[4.25rem] lg:text-[4.75rem]"
            >
              A conversa começa <br />
              pelo seu <em className="italic">interesse.</em>
            </h2>
            <p className="mt-6 max-w-[28rem] text-muted md:mt-8 md:text-[1.125rem]">
              Para saber mais sobre uma área ou falar sobre agendamento, o próximo passo é
              pelo WhatsApp.
            </p>
            <div className="mt-8 md:mt-10">
              <ConversationButton className="btn-primary">
                Conversar pelo WhatsApp
                <Arrow />
              </ConversationButton>
            </div>
          </div>
        </div>

        <SignatureFragment className="pointer-events-none absolute right-0 bottom-0 h-[11rem] w-[15rem] translate-x-[18%] translate-y-[22%] md:h-[17rem] md:w-[24rem] lg:right-auto lg:left-[4%] lg:h-[22rem] lg:w-[30rem] lg:translate-x-0 lg:translate-y-[30%]" />
      </div>
    </section>
  );
}
