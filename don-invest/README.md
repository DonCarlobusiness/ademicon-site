# DON INVEST

**Inteligência para construir seu futuro financeiro.**

Plataforma de **pesquisa e comparação de investimentos com dados reais e verificáveis**. Você informa o capital (ex.: R$ 750) e os prazos (curto, médio, longo ou indefinido); o sistema consulta fontes oficiais ao vivo, valida os dados, calcula custos, impostos, liquidez, riscos e acessibilidade ao seu valor e entrega um relatório com trilha de evidências.

> Ferramenta de pesquisa e educação. **Não é consultoria individualizada (Res. CVM 19/20) e não executa ordens.**

## Executar localmente

```bash
cd don-invest
npm install
cp .env.example .env.local   # opcional; funciona sem chaves
npm run dev                  # http://localhost:3000
```

Produção: `npm run build && npm start`.

Atrás de proxy corporativo, defina `HTTPS_PROXY` (e o CA via `NODE_EXTRA_CA_CERTS`); o coletor usa o proxy automaticamente.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint (config Next) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Testes unitários com fixtures capturadas das APIs reais |
| `npm run test:integration` | Testes **ao vivo** (BCB, Kraken, Tesouro, pipeline) |
| `npm run evidence` | Roda a pesquisa de R$ 750 (curto + longo) contra as fontes reais e imprime evidências |
| `npm run build` | Build de produção |

## Fontes integradas (Fase 1)

| Fonte | Status |
|---|---|
| Banco Central — SGS (Selic meta/efetiva, CDI, IPCA, dólar, poupança) | ✅ ao vivo |
| Tesouro Transparente — taxas e preços oficiais do Tesouro Direto | ✅ ao vivo |
| Kraken — ticker, mínimos de ordem, histórico diário (BTC, ETH) | ✅ ao vivo, só dados públicos |
| CVM Dados Abertos | ⚠ disponibilidade apenas |
| Ações/FIIs/ETFs/REITs | ❌ requer provedor licenciado — exibido como indisponível |

Detalhes: [docs/data-sources.md](docs/data-sources.md) · [docs/methodology.md](docs/methodology.md) · [docs/compliance.md](docs/compliance.md) · [docs/known-limitations.md](docs/known-limitations.md)

## Telas

- `/dashboard` — pesquisa mais recente, macro confirmado, destaques e histórico
- `/pesquisar` — formulário (capital, objetivo, prazos, liquidez, perfil preliminar, premissas, oferta manual)
- `/relatorios/[id]` — relatório completo por horizonte, tabela verificável, matriz explicável com pesos editáveis, cenários, plataformas, classes indisponíveis, trilha de evidências e auditoria; exporta CSV/JSON
- `/ativos` — ativos da última pesquisa com filtros
- `/instituicoes` — comparador de plataformas (verificado × catalogado × não verificado)
- `/configuracoes` — saúde dos conectores (teste ao vivo), flags e privacidade

## API

- `POST /api/research` — executa a pesquisa (validação Zod, rate limit) → `{ id, status, providerRuns }`
- `GET /api/reports/:id[?format=csv]` — relatório JSON ou CSV
- `GET /api/reports` — últimos relatórios
- `GET /api/health[?live=1]` — status dos provedores

## Arquitetura

```
src/lib/market-data/   conectores (bcb, kraken, tesouro, cvm, quotes), fetch seguro, cache, circuit breaker
src/lib/finance/       funções puras: juros, taxas, IR/IOF, custos, mínimos, cenários, estatísticas
src/lib/analysis/      7 agentes lógicos, matriz de aderência, síntese, pipeline research.ts
src/lib/catalog/       regras documentadas (com URL oficial), marcadas como "regra catalogada"
src/app/               páginas e rotas de API (Next.js App Router)
tests/                 unitários (fixtures reais) e integração ao vivo
supabase/migrations/   esquema e RLS para a Fase 2
```
