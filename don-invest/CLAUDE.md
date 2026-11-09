# CLAUDE.md — DON INVEST

Regras para agentes que trabalharem neste projeto:

1. **Prioridade é o núcleo de pesquisa com dados reais.** O módulo educativo/jogo (/academia) é Fase 3 e não deve atrasar o núcleo.
2. **Nunca invente números.** Todo número exibido precisa de `SourceRecord` (API oficial, publicação oficial, regra catalogada com URL ou entrada manual marcada). Se uma fonte falha, o relatório fica parcial/indisponível — nunca substituir por valores fixos.
3. **Cálculos financeiros só em funções puras testadas** (`src/lib/finance`). LLMs, quando integrados (Fase 2), recebem apenas dados estruturados auditados e não calculam impostos/juros.
4. **Somente dados públicos de mercado.** Nada de chaves de exchange, ordens, saques, credenciais bancárias ou CPF.
5. **Compliance:** `REGULATED_ADVICE_ENABLED` permanece bloqueado; não escrever “recomendamos comprar”, “melhor investimento” ou promessas de retorno. Pontuação = aderência ao perfil informado.
6. **Novo host externo** → adicionar a `ALLOWED_HOSTS` em `src/lib/market-data/http.ts`, com timeout/cache/validação Zod e testes com fixture.
7. Datas em UTC no armazenamento; exibição em `America/Bahia`.
8. Antes de concluir: `npm run lint && npm run typecheck && npm test && npm run build` e, com rede, `npm run test:integration`.
