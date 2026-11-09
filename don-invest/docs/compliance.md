# Compliance — DON INVEST

## Enquadramento

O DON INVEST é ferramenta de **pesquisa, educação, comparação de dados e cenários informativos**. Não é:

- consultoria de valores mobiliários individualizada (exige autorização da CVM — **Resolução CVM 19/2021**);
- análise de valores mobiliários profissional (exige credenciamento — **Resolução CVM 20/2021**);
- intermediação, gestão ou execução de ordens.

Um aviso genérico **não substitui** registro/autorização.

## Controles implementados

| Controle | Onde |
|---|---|
| Flag `REGULATED_ADVICE_ENABLED` (padrão `false`). Mesmo se `true`, o modo permanece **bloqueado** porque não está implementado nem autorizado | `src/lib/compliance.ts` (+ teste) |
| Nenhuma conexão de conta, ordem, saque ou permissão de trading | conectores usam apenas endpoints públicos |
| Pontuação descrita como “aderência ao perfil informado”, nunca “melhor investimento” | `scoring.ts`, `synthesis.ts` |
| Cenários rotulados como hipótese, com premissas visíveis e editáveis | relatório |
| Separação: dado observado × hipótese × entrada manual × (futura) interpretação de IA | tipos `ObtainMethod`, `DataStatus`, migração SQL |
| Resultado “não há base suficiente” tratado como válido | `research.ts` |
| Avisos regulatórios em todo relatório e no rodapé | `DISCLAIMERS` |

## Privacidade (LGPD)

- MVP não coleta CPF, nome, dados bancários, chaves de exchange ou credenciais.
- Modo local: relatórios em `.data/reports` (fora do Git) com retenção de 30 dias.
- Segredos só no servidor (`.env.local`); `.env.example` sem valores.
- Supabase (Fase 2) com RLS por usuário (ver `supabase/migrations/0001_init.sql`).

## Antes de oferecer como serviço

Revisão jurídica; avaliar registro na CVM conforme o modelo de negócio; política de privacidade e termos de uso; DPO/encarregado; avaliação de suitability formal se houver recomendação individualizada.
