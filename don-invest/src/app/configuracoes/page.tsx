import { providerHealth } from "@/lib/market-data/health";
import { HealthPanel } from "@/components/HealthPanel";
import { Section } from "@/components/ui";
import { RETENTION_DAYS } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fontes e configurações — DON INVEST" };

export default async function Configuracoes() {
  const h = await providerHealth({ live: false });
  return (
    <div className="space-y-6">
      <Section title="Status das fontes de dados" subtitle="Conectores com timeout, retry com backoff, cache TTL e circuit breaker.">
        <HealthPanel initial={h} />
      </Section>
      <Section title="Configuração do servidor" subtitle="Segredos ficam apenas no servidor (.env.local). Nada é exposto ao navegador.">
        <ul className="space-y-2 text-sm">
          <li>Recomendação individualizada regulada: <strong className="text-red-300">bloqueada</strong> — {h.compliance.notice}</li>
          <li>Mentor com IA (Anthropic): {h.anthropicConfigured ? "chave detectada (mentor ainda é Fase 2)" : "não configurado — o sistema funciona em modo pesquisa determinística"}</li>
          <li>Supabase: {h.supabaseConfigured ? "variáveis detectadas (integração é Fase 2)" : "não configurado — modo local limitado (relatórios em .data/, sem dados bancários)"}</li>
          <li>Retenção local de relatórios: {RETENTION_DAYS} dias. Não coletamos CPF, senhas, chaves de exchange ou dados bancários.</li>
          <li>Hosts permitidos para coleta: api.bcb.gov.br, api.kraken.com, www.tesourotransparente.gov.br, dados.cvm.gov.br (somente HTTPS).</li>
        </ul>
      </Section>
    </div>
  );
}
