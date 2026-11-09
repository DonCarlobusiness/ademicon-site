import Link from "next/link";
import { Section } from "@/components/ui";

export const metadata = { title: "Minha carteira — DON INVEST" };

export default function Carteira() {
  return (
    <Section title="Minha carteira" subtitle="Ainda não disponível.">
      <p className="text-sm text-slate-300">
        Acompanhar uma carteira exige login e armazenamento seguro dos seus dados (planejado com Supabase e controle de acesso por usuário). Nesta versão nenhuma conta
        bancária ou corretora é conectada e nada é salvo além dos parâmetros do simulador no seu próprio navegador.
      </p>
      <p className="mt-3 text-sm"><Link href="/" className="text-electric-400 hover:underline">Voltar ao simulador e à pesquisa</Link></p>
    </Section>
  );
}
