/**
 * Controles regulatórios. Recomendação individualizada sobre valores mobiliários
 * exige registro/autorização na CVM (Res. CVM 19 — consultoria; Res. CVM 20 — análise).
 * Este produto NÃO implementa modo regulado; a flag existe apenas como trava.
 */

export function complianceMode(env: Record<string, string | undefined> = process.env) {
  const requested = (env.REGULATED_ADVICE_ENABLED || "false").toLowerCase() === "true";
  return {
    regulatedAdviceEnabled: false as const,
    requested,
    notice: requested
      ? "REGULATED_ADVICE_ENABLED=true foi solicitado, mas o modo de recomendação individualizada regulada NÃO está implementado nem autorizado nesta versão e permanece bloqueado."
      : "Modo de recomendação individualizada regulada: DESATIVADO (REGULATED_ADVICE_ENABLED=false).",
  };
}

export const DISCLAIMERS = [
  "O DON INVEST é uma ferramenta de pesquisa, educação e comparação de dados. Não é consultoria de valores mobiliários individualizada, não é análise profissional registrada e não substitui profissional autorizado pela CVM.",
  "Nenhuma ordem de investimento é executada, enviada ou sugerida para execução automática. Nenhuma conta de banco, corretora ou exchange é conectada.",
  "Rentabilidade passada não garante rentabilidade futura. Cenários são ilustrativos, baseados em hipóteses visíveis e editáveis; não são promessa de retorno.",
  "Confirme preços, taxas, custos e condições diretamente nas fontes oficiais antes de qualquer decisão.",
];
