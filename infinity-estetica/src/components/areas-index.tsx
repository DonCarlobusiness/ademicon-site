import { areas } from "@/content/site";
import { Arrow, ConversationButton } from "./demo-dialog";
import { SectionMarker } from "./section-marker";

export function AreasIndex() {
  return (
    <section
      id="areas"
      aria-labelledby="areas-title"
      className="mx-auto max-w-[90rem] px-5 pt-20 pb-20 xs:px-6 md:px-10 md:pt-32 md:pb-28 xl:px-16"
    >
      <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-8">
        <header className="lg:col-span-4">
          <SectionMarker index="01" label="Áreas" />
          <h2
            id="areas-title"
            className="display mt-5 text-[2.25rem] xs:text-[2.5rem] md:text-[3.5rem]"
          >
            Áreas em foco.
          </h2>
          <p className="mt-5 max-w-[22rem] text-muted">
            Facial, corporal e capilar estão entre as áreas divulgadas pela Infinity.
          </p>
        </header>

        <div className="lg:col-span-8 lg:pt-[2.35rem]">
          <ol className="border-t border-ink/80">
            {areas.map((area, i) => {
              const [lead, focus] = area.label.split(" ");
              return (
                <li key={area.id} className="area-row border-b border-rule">
                  <div className="flex min-h-[5.75rem] items-center gap-4 py-5 md:min-h-[8.5rem] md:gap-8 md:py-7">
                    <span className="flex w-8 shrink-0 flex-col gap-2 self-start pt-2 md:w-14 md:pt-4">
                      <span className="font-sans text-[0.75rem] font-semibold tracking-[0.12em] text-muted tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span aria-hidden="true" className="area-mark h-px w-6 bg-ochre" />
                    </span>

                    <h3 className="area-title display min-w-0 flex-1 text-[1.875rem] leading-[1.05] xs:text-[2.0625rem] md:text-[3.25rem] lg:text-[3.5rem]">
                      <span className="block sm:inline">{lead}</span>{" "}
                      <em className="block italic sm:inline">{focus}</em>
                    </h3>

                    <ConversationButton
                      area={area.label}
                      aria-label={`Conversar sobre ${area.label.toLowerCase()}`}
                      className="area-action flex min-h-12 shrink-0 items-center gap-3 text-[0.9375rem] font-semibold text-umber"
                    >
                      Conversar
                      <Arrow />
                    </ConversationButton>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-8 max-w-[28rem] text-muted md:mt-10 md:ml-[5.5rem] md:text-[1.0625rem]">
            Tem interesse em uma dessas áreas?{" "}
            <span className="text-ink">A conversa pode começar por ela.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
