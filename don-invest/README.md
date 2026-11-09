# DON INVEST

**Inteligência para construir seu futuro financeiro.**

Plataforma de **pesquisa, simulação e comparação de investimentos com dados reais e verificáveis**.

Fluxo principal (página inicial `/`):

1. **Quanto você quer investir?** — capital inicial (qualquer valor, inclusive zero se houver aportes), aporte mensal, objetivo, prazo (1, 3, 6, 12 meses; 3, 5, 10, 20, 30 anos ou personalizado), liquidez, perfil declarado, reserva, moeda e mercado.
2. **Calcular projeções** — funciona offline, recalcula a cada mudança: total investido, patrimônio bruto, lucro bruto (R$ e %), impostos/custos (ou “impostos não calculados”), líquido só quando calculável, poder de compra, plano de retiradas opcional, 4 cenários editáveis (estressado, conservador, intermediário, otimista), gráfico principal × juros e tabela mês/ano. Botão para usar CDI, poupança e IPCA atuais do Banco Central.
3. **Pesquisar oportunidades agora** — consulta fontes oficiais ao vivo e mostra, no mesmo painel, até 5 opções por prazo com mínimo, taxa observada (fonte e data), liquidez, risco, projeções com seus aportes (IR por lote) e onde verificar a oferta; conectores que falharam e classes sem cobertura aparecem explicitamente.

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
| `npm run evidence` | Pesquisa real de R$ 750 + R$ 250/mês (3, 12, 60, 120 meses); imprime evidências e grava `docs/evidence/research-sample.json` |
| `npm run test:e2e` | Smoke test da tela com Playwright contra um servidor rodando (`BASE_URL`, padrão http://localhost:3000); requer `npm i -D playwright && npx playwright install chromium` |
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

## Celular e desktop

A mesma aplicação se adapta à tela:

| | Celular e tablet (< 1024 px) | Desktop (≥ 1024 px) |
|---|---|---|
| Navegação | Barra inferior fixa (Início, Pesquisar, Simulador, Mentor, Mais) | Menu completo no cabeçalho fixo, item ativo destacado |
| Resultado da pesquisa | Cartões por opção, com projeções em lista | Tabela comparativa |
| Campos | Teclado numérico, fonte ≥ 16 px (sem zoom no iPhone), alvos de toque ≥ 40–44 px | Mesmos campos, mais densos |
| Gráfico | Mede a largura real; rótulos sempre legíveis | Idem |

Também há manifesto e ícone: no celular, “Adicionar à tela inicial” abre o DON INVEST em tela cheia, respeitando as áreas seguras (notch e barra do sistema).

## Mentor IA (opcional)

Com `ANTHROPIC_API_KEY` no servidor (`.env.local`), `/mentor` responde perguntas usando a pesquisa mais recente. O modelo (padrão `claude-opus-5-5`, configurável por `ANTHROPIC_MODEL`) não calcula: chama ferramentas que executam as funções testadas (`projetar_investimento`, `consultar_pesquisa`, `sugerir_filtros`). A resposta passa por auditoria automática que marca números não rastreados e bloqueia promessas de rentabilidade e “recomendo comprar”. Sem chave, a tela informa como configurar e todo o resto funciona.

## Telas

- `/` — Início: “Quanto você quer investir?”, calculadora e pesquisa real no mesmo painel
- `/simulador` — calculadora sem a pesquisa
- `/mentor` — Mentor IA (opcional)
- `/carteira`, `/academy` — ainda não disponíveis (informado na tela)
- `/dashboard` — histórico de pesquisas e macro confirmado
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
- `GET /api/macro` — indicadores oficiais do BCB para o simulador
- `POST /api/mentor` — Mentor IA (503 se não configurado)

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
