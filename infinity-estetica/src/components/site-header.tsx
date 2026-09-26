import { studio } from "@/content/site";

const nav = [
  { href: "#areas", label: "Áreas" },
  { href: "#endereco", label: "Endereço" },
  { href: "#conversa", label: "Conversar" },
];

/** Typographic identity until an authorized logo exists. */
export function Wordmark() {
  return (
    <span className="flex flex-col leading-none">
      <span className="font-sans text-[0.8125rem] font-bold tracking-[0.32em] text-ink">
        INFINITY
      </span>
      <span className="display mt-1 text-[1.0625rem] italic tracking-[-0.01em] text-muted">
        Estética
      </span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="relative z-10 mx-auto max-w-[90rem] px-5 xs:px-6 md:px-10 xl:px-16">
      <div className="flex items-center justify-between gap-4 pt-4 md:pt-7">
        <a
          href="#inicio"
          className="-ml-1 flex min-h-12 items-center px-1"
          aria-label="Infinity Estética — início"
        >
          <Wordmark />
        </a>

        <nav aria-label="Principal">
          <ul className="-mr-2 flex items-center">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="flex min-h-12 items-center px-2 text-[0.875rem] font-semibold text-ink underline decoration-transparent decoration-1 underline-offset-[0.45em] transition-[text-decoration-color] duration-[160ms] hover:decoration-ochre xs:px-3 md:text-[0.9375rem]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="mt-1 text-[0.6875rem] tracking-[0.02em] text-muted/90 md:absolute md:top-full md:mt-0 md:pt-1">
        {studio.conceptLine}
      </p>
    </header>
  );
}
