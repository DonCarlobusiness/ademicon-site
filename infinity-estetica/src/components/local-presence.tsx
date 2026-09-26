import { addressPlainText, business } from "@/content/site";
import { CopyAddress } from "./copy-address";
import { SectionMarker } from "./section-marker";

export function LocalPresence() {
  const { address } = business;
  return (
    <section id="endereco" aria-labelledby="endereco-title" className="bg-sand">
      <div className="mx-auto grid max-w-[90rem] gap-y-12 px-5 py-20 xs:px-6 md:px-10 md:py-28 lg:grid-cols-12 lg:gap-x-8 xl:px-16">
        <header className="lg:col-span-4">
          <SectionMarker index="02" label="Endereço" />
          <h2
            id="endereco-title"
            className="display mt-5 text-[2.25rem] xs:text-[2.5rem] md:text-[3.5rem]"
          >
            Infinity, <br />
            no <em className="whitespace-nowrap italic">Jardim Paraíso.</em>
          </h2>
        </header>

        <div className="lg:col-span-8 lg:pt-[2.35rem]">
          <address className="not-italic">
            <div className="grid gap-x-8 border-t border-ink/80 pt-8 md:grid-cols-[auto_1fr] md:items-end md:pt-10">
              <p className="display text-[5.5rem] leading-[0.82] tracking-[-0.04em] xs:text-[6.25rem] md:text-[9rem] lg:text-[10.5rem]">
                <span className="sr-only">Número </span>
                <span aria-hidden="true" className="mr-2 align-top font-sans text-[0.8125rem] font-semibold tracking-[0.14em] text-muted md:text-[0.875rem]">
                  Nº
                </span>
                {address.number}
              </p>

              <div className="mt-8 md:mt-0 md:pb-3">
                <p className="display text-[1.625rem] leading-[1.15] xs:text-[1.75rem] md:text-[2rem]">
                  {address.street}
                </p>
                <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[0.9375rem] md:text-base">
                  <dt className="eyebrow self-center text-[0.6875rem]">Bairro</dt>
                  <dd className="text-ink">{address.district}</dd>
                  <dt className="eyebrow self-center text-[0.6875rem]">Cidade</dt>
                  <dd className="text-ink">{address.cityLine}</dd>
                  <dt className="eyebrow self-center text-[0.6875rem]">CEP</dt>
                  <dd className="text-ink tabular-nums">{address.cep}</dd>
                </dl>
              </div>
            </div>
          </address>

          <div className="mt-10 border-t border-ink/15 pt-8 md:mt-12">
            <CopyAddress text={addressPlainText} />
          </div>
        </div>
      </div>
    </section>
  );
}
