# SEIVA — Agrônomo de Bolso no WhatsApp

## 1. O que é
Agente de IA no WhatsApp que atende pequenos e médios produtores rurais como um agrônomo de
campo: recebe localização/fotos/áudio, analisa o talhão por satélite, recomenda manejo,
calcula insumos e custo e acompanha a safra com mensagens proativas.
Idioma inicial: pt-BR. Preparado para es-419 e en desde o dia 1.

## 2. Usuário-alvo
- Produtor com 5–300 ha (grãos, café, hortaliças, pastagem) sem agrônomo fixo.
- Usa WhatsApp e áudio; baixa familiaridade com apps; conexão instável.
- Todo fluxo deve funcionar por texto, áudio e foto. Nunca exigir cadastro longo.

## 3. Funcionalidades — MVP (fase 1)
1. Onboarding por WhatsApp: nome, município, cultura, área (ha), localização (pin).
2. Mapa do talhão via satélite: NDVI/NDRE (Sentinel-2), PNG com legenda simples.
3. Diagnóstico por foto: praga/doença/deficiência + confiança + próximo passo.
4. Calculadora de insumos: NPK por cultura/meta a partir do laudo de solo (OCR) ou estimativa regional.
5. Clima do talhão: previsão 7 dias + janela de aplicação/plantio/colheita.
6. Custo e margem: por ha (insumos, operações, frete) vs. preço spot da região.
7. Mensagens proativas: estresse hídrico, queda de NDVI, geada/chuva forte, janela de mercado.

## 4. Fase 2
- Histórico de safras e comparação ano a ano.
- Marketplace de insumos e serviços (revenda parceira, drone, laboratório).
- Plano de venda da safra (corretagem de grãos — Terra Oeste / MERIDIAN).
- Painel web para cooperativas/revendas gerenciarem carteiras de produtores.

## 5. Regras de produto (NÃO NEGOCIÁVEIS)
Estas regras são verificáveis em código. Não relaxe nenhuma delas.

- **Linguagem de produtor**: frases curtas, sem jargão, sempre com "o que fazer agora".
  Implementado em `src/agent/systemPrompt.ts`.
- **Áudio responde áudio**: se `inbound.kind === 'audio'`, a resposta sai por áudio (TTS)
  com o texto junto como legenda. Ver `src/channels/whatsapp/reply.ts`.
- **Agrotóxico**: toda recomendação de defensivo carrega o aviso de receituário agronômico
  obrigatório (Lei 7.802/89). O agente orienta, não prescreve. O aviso é anexado em código
  (`src/agent/guards.ts`), não confiado ao modelo.
- **Nunca inventar dado de satélite ou clima**: as ferramentas retornam
  `{ ok: false, reason: 'no_clear_pass' }` quando não há passagem sem nuvem, e o system
  prompt proíbe estimar o número. Ver `src/services/satellite/sentinelHub.ts`.
- **LGPD**: consentimento gravado no onboarding (`producers.lgpd_consent_at`). Dados
  geográficos pertencem ao produtor; há rota de exportação e exclusão.

## 6. Stack (escolhida e fixa)
- **WhatsApp**: Meta Cloud API (webhook). Alternativa dev/local: Evolution API.
- **Backend**: Node.js + TypeScript + Fastify. *(Escolhido em vez de FastAPI porque a spec
  pede BullMQ para filas, que é Node-only. Não misturar runtimes.)*
- **IA**: Anthropic API (Claude) com tool use — `get_ndvi`, `get_weather`, `diagnose_photo`,
  `fertilizer_calc`, `market_price`.
- **Satélite**: Sentinel Hub (Copernicus); fallback Planetary Computer.
- **Clima**: Open-Meteo (grátis) com fallback INMET.
- **Áudio**: Whisper (STT) + TTS pt-BR.
- **Banco**: Postgres + PostGIS (talhões como polígonos).
- **Filas/agendamento**: BullMQ (Redis) para alertas proativos.
- **Deploy**: Docker; Railway/Render/Fly.io. Logs estruturados (pino).

## 7. Estrutura de pastas
```
src/
  index.ts              bootstrap Fastify
  config/env.ts         env validado (zod) — falha rápido no boot
  lib/                  logger, http, erros
  domain/               tipos do domínio (Producer, Field, Inbound…)
  i18n/                 pt-BR (default), es-419, en
  channels/whatsapp/    webhook, assinatura, parser, envio, reply
  agent/                loop de tool use, system prompt, guards, tools/
  services/             satellite, weather, agronomy, market, media
  db/                   pool + repositórios
  jobs/                 BullMQ: alertas proativos
db/migrations/          SQL (PostGIS)
```

## 8. Convenções de código
- ESM (`"type": "module"`); imports relativos terminam em `.js`.
- Nada de `any` em fronteira de API — validar entrada externa com zod.
- Toda chamada externa passa por `lib/http.ts` (timeout + retry) e nunca lança para o webhook.
- Ferramentas do agente retornam `ToolResult` discriminado (`ok: true | false`), nunca lançam.
  Uma falha vira texto honesto para o modelo, não uma alucinação.
- Toda string voltada ao produtor vem de `src/i18n/` — nunca hardcode pt-BR na lógica.
- Modelo: `claude-opus-5` com `thinking: { type: 'adaptive' }`. Não usar `budget_tokens`
  (removido nesta geração, retorna 400).

## 9. Comandos
```bash
npm install
npm run dev        # Fastify com reload
npm run build      # tsc
npm run typecheck  # tsc --noEmit
npm run test       # node --test
docker compose up  # postgres+postgis, redis, app
```
