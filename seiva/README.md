# SEIVA — Agrônomo de Bolso no WhatsApp

Agente de IA que atende pequenos e médios produtores rurais pelo WhatsApp como um
agrônomo de campo: analisa o talhão por satélite, lê o clima da área, diagnostica
praga por foto, calcula adubação e acompanha a safra com alertas proativos.

Funciona por **texto, áudio e foto**. Áudio é respondido com áudio.

> A especificação de produto completa está em [`CLAUDE.md`](./CLAUDE.md).

---

## Começar

**[SETUP.md](./SETUP.md) tem o passo a passo completo.** O resumo:

```bash
cp .env.example .env          # só ANTHROPIC_API_KEY é obrigatória para começar
docker compose up -d db
npm install && npm run migrate
npm run doctor                # diz exatamente o que ainda falta
npm run chat                  # conversa com o agente no terminal
```

`npm run chat` roda o agente inteiro sem WhatsApp — mesmo onboarding, mesmas
ferramentas, mesmas respostas. Dá para validar o produto antes de encarar a
aprovação da Meta, que leva dias.

`npm run doctor` testa cada integração de verdade (autentica na Anthropic,
conecta no Postgres, chama a Graph API) e separa o que **bloqueia** do que só
**degrada**.

### Testes

```bash
npm test          # unitários, sem rede e sem banco
DATABASE_URL=postgres://seiva:seiva@localhost:5432/seiva npm run test:db
```

Os testes de banco rodam contra Postgres+PostGIS real. Pegam coisas que teste
unitário não pega: coluna ambígua em JOIN, inversão de lat/lon no
`ST_MakePoint`, cascade da exclusão LGPD.

### Ligando o webhook da Meta

1. Exponha a porta 3000 (`ngrok http 3000` em desenvolvimento).
2. No app da Meta, cadastre `https://SEU_HOST/webhook/whatsapp` com o mesmo
   `WHATSAPP_VERIFY_TOKEN` do `.env`.
3. Assine o campo `messages`.
4. `WHATSAPP_APP_SECRET` é **obrigatório em produção** — sem ele o processo não
   sobe, porque sem validar a assinatura qualquer um fala em nome de um produtor.

---

## O que já funciona (MVP)

| Feature | Onde |
|---|---|
| Onboarding por WhatsApp (consentimento LGPD, nome, pin, cultura, área) | `src/channels/whatsapp/onboarding.ts` |
| NDVI/NDRE do talhão + mapa PNG com legenda | `src/services/satellite/` |
| Diagnóstico por foto com nível de confiança | `src/agent/tools/diagnosePhoto.ts` |
| Adubação NPK + calagem | `src/services/agronomy/fertilizer.ts` |
| Clima 7 dias + janela de aplicação | `src/services/weather/` |
| Leitura do laudo de solo (foto ou PDF) | `src/agent/tools/readSoilReport.ts` |
| Alertas proativos (geada, chuva forte, seca, queda de NDVI) | `src/jobs/proactive.ts` |
| pt-BR, es-419, en | `src/i18n/` |
| Diagnóstico de configuração | `src/scripts/doctor.ts` |
| Conversa por terminal, sem WhatsApp | `src/scripts/chat.ts` |

Preço spot (`market_price`) está implementado mas **desligado por padrão**: sem um
feed contratado ele retorna "não tenho cotação" em vez de chutar um número que o
produtor usaria para fechar negócio.

---

## Decisões que valem saber

**Backend é Node + TypeScript, não Python.** A spec deixava a escolha aberta mas
pedia BullMQ para as filas, que é Node-only. Misturar runtimes por causa de uma
fila não se paga.

**As regras de produto estão em código, não no prompt.** O aviso de receituário
agronômico (Lei 7.802/89) é anexado por `src/agent/guards.ts` depois que o modelo
responde — exigência legal não pode depender do modelo lembrar. Quando não há
passagem de satélite sem nuvem, a ferramenta devolve `{ ok: false, reason:
'no_clear_pass' }` e o texto que volta ao modelo manda explicitamente *não*
estimar valor.

**O webhook responde 200 na hora e processa depois.** A Meta reentrega se demorar,
e uma volta com satélite + clima passa do prazo dela. A tabela
`processed_messages` garante que a reentrega não gere resposta duplicada.

**O onboarding não passa pelo modelo.** São quatro perguntas e cada uma grava
estado; consentimento LGPD não pode depender de interpretar bem um "uhum".

**O histórico da conversa guarda os blocos da Messages API inteiros**, incluindo
`tool_use` e `tool_result` — é o que o loop precisa reenviar na mensagem seguinte.

---

## Arquitetura

```
WhatsApp (Meta Cloud API)
   │  webhook  → valida assinatura → 200 imediato
   ▼
handler.ts ──► onboarding (determinístico)
   │
   └──► agent/runner.ts  ── loop de tool use (Claude) ──┐
                                                        │
        get_ndvi · get_weather · diagnose_photo ·       │
        fertilizer_calc · market_price  ◄───────────────┘
                    │
                    ▼
        Sentinel Hub · Open-Meteo · Postgres/PostGIS

jobs/proactive.ts ── BullMQ, varredura diária 09:00 UTC ──► alertas
```

---

## O que falta para produção

Nada disso bloqueia o sistema de atender — são melhorias.

- **Fallback Planetary Computer** para satélite e **INMET** para clima. Hoje,
  se o Sentinel Hub cair, o NDVI simplesmente fica indisponível (o agente diz
  isso, não inventa).
- **Templates de mensagem aprovados na Meta** para os alertas proativos: fora
  da janela de 24 h só se envia template. Sem isso o alerta de geada só chega
  a quem falou com o bot recentemente.
- **Agendador BullMQ em worker dedicado** se rodar mais de uma instância —
  hoje toda instância sobe o scheduler.
- **Feed de preço spot** (`MARKET_PRICE_BASE_URL`). Sem contrato, o agente
  responde "não tenho cotação" em vez de chutar.

### Limitações conhecidas

- Reverse geocoding usa Nominatim (1 req/s, exige User-Agent). Em volume,
  troque por provedor contratado ou pelo shapefile do IBGE. Quando falha, o
  cadastro segue sem o município.
- As imagens de áudio (`--profile audio`) não foram exercitadas neste
  ambiente porque o registry estava bloqueado; o cliente HTTP dos dois
  serviços segue o formato OpenAI, que é o que essas imagens expõem.
