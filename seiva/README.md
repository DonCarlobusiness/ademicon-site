# SEIVA — Agrônomo de Bolso no WhatsApp

Agente de IA que atende pequenos e médios produtores rurais pelo WhatsApp como um
agrônomo de campo: analisa o talhão por satélite, lê o clima da área, diagnostica
praga por foto, calcula adubação e acompanha a safra com alertas proativos.

Funciona por **texto, áudio e foto**. Áudio é respondido com áudio.

> A especificação de produto completa está em [`CLAUDE.md`](./CLAUDE.md).

---

## Como rodar

```bash
cp .env.example .env      # preencha as chaves
docker compose up -d db redis
npm install
npm run build
npm run migrate           # cria o schema PostGIS
npm run dev
```

Testes (não fazem chamada de rede):

```bash
npm test
```

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
| Alertas proativos (geada, chuva forte, seca, queda de NDVI) | `src/jobs/proactive.ts` |
| pt-BR, es-419, en | `src/i18n/` |

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

- **OCR do laudo de solo** (`kind === 'document'` hoje responde "não consigo abrir").
  Sem ele a adubação usa estimativa regional, que é bem menos precisa.
- **STT/TTS**: `STT_PROVIDER`/`TTS_PROVIDER` vêm desligados. Sem STT o áudio do
  produtor não é transcrito — é a via preferida do público-alvo, então é a
  primeira integração a ligar.
- **Fallback Planetary Computer** para satélite e **INMET** para clima.
- **Estado do onboarding em Redis** — hoje o pin entre duas mensagens fica em
  memória do processo, o que só é correto rodando uma instância.
- **Rate limit por produtor**, para custo de API não escalar com mensagem repetida.
