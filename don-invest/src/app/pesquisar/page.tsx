import { ResearchForm } from "@/components/ResearchForm";

export const metadata = { title: "Pesquisar oportunidades — DON INVEST" };

export default function Pesquisar() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Pesquisar oportunidades</h1>
        <p className="mt-1 text-sm text-slate-400">
          Informe seu capital e prazos. O DON INVEST consulta fontes oficiais ao vivo, valida os dados e compara custos, liquidez, riscos e acessibilidade
          para o seu valor. Nenhuma ordem é executada.
        </p>
      </div>
      <ResearchForm />
    </div>
  );
}
