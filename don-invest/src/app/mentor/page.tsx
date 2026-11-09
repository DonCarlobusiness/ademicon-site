import { MentorChat } from "@/components/MentorChat";
import { Section } from "@/components/ui";
import { mentorConfigured } from "@/lib/mentor/mentor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mentor IA — DON INVEST" };

export default function Mentor() {
  return (
    <Section title="Mentor IA" subtitle="Explica trade-offs usando a pesquisa mais recente. Não inventa números: usa as funções de cálculo e os dados auditados, e a resposta passa por uma auditoria automática.">
      <MentorChat configured={mentorConfigured()} />
      <p className="mt-4 text-xs text-slate-500">Não é consultoria registrada na CVM, não promete rentabilidade e não executa ordens.</p>
    </Section>
  );
}
