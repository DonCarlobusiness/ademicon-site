# Colocar o SEIVA no ar

Três estágios. Você consegue conversar com o agente no **Estágio 1**, sem
depender da aprovação da Meta — que é a parte demorada.

Rode `npm run doctor` a qualquer momento: ele testa cada integração de verdade
e diz o que falta, separando o que **bloqueia** do que só **degrada**.

---

## Estágio 1 — Falar com o agente hoje (≈15 min)

Só precisa de uma chave da Anthropic e do Postgres local.

### 1. Chave da Anthropic

1. Entre em **console.anthropic.com** → *API keys* → *Create key*.
2. Coloque crédito em *Plans & Billing* (o agente não responde sem saldo).
3. No `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

### 2. Banco

```bash
cp .env.example .env
docker compose up -d db          # Postgres 16 + PostGIS
npm install
npm run migrate
```

> Sem Docker: `apt install postgresql-16 postgresql-16-postgis-3`, crie o
> banco e a role `seiva`, e aponte `DATABASE_URL` para ele.

### 3. Conversar

```bash
npm run doctor    # deve mostrar Anthropic e Postgres em OK
npm run chat
```

`npm run chat` roda o agente inteiro no terminal — mesmo onboarding, mesmas
ferramentas, mesmas respostas que o produtor receberia. Comandos:

```
/pin -12.5453 -55.7211    manda uma localização
/foto lavoura.jpg         manda uma imagem (folha, praga, laudo)
/pdf laudo.pdf            manda um PDF de análise de solo
/reset                    apaga o produtor e recomeça
```

Neste estágio funcionam: onboarding, diagnóstico por foto, leitura de laudo,
cálculo de adubação e clima. **NDVI ainda não** (falta o Sentinel Hub).

---

## Estágio 2 — Satélite e alertas (≈20 min)

### Sentinel Hub (NDVI e mapa do talhão)

1. Conta grátis em **dataspace.copernicus.eu**.
2. Menu do usuário → *Sentinel Hub* → *User settings* → *OAuth clients* → *Create*.
3. Copie **client id** e **secret** (o secret aparece uma vez só).
4. No `.env`:
   ```
   SENTINEL_HUB_CLIENT_ID=...
   SENTINEL_HUB_CLIENT_SECRET=...
   SENTINEL_HUB_BASE_URL=https://sh.dataspace.copernicus.eu
   ```

> A conta gratuita do Copernicus tem cota mensal de processamento. Para
> produção com muitos talhões, avalie o plano pago ou o fallback Planetary
> Computer.

### Redis (alertas proativos)

```bash
docker compose up -d redis
```

Sem ele não saem os alertas de geada, chuva forte, seca e queda de NDVI.

### Áudio (STT/TTS)

Áudio é a via preferida do produtor — sem STT o SEIVA responde
"não entendi" para a entrada mais natural dele.

```bash
docker compose --profile audio up -d stt tts
```

No `.env`:
```
STT_PROVIDER=whisper_local
STT_BASE_URL=http://localhost:9000
TTS_PROVIDER=http
TTS_BASE_URL=http://localhost:5002
```

Os dois contêineres expõem API compatível com OpenAI, que é o formato que
`src/services/media/` já fala. A primeira subida baixa os modelos (~1–2 GB).

---

## Estágio 3 — WhatsApp de verdade (dias, por conta da Meta)

O gargalo é a Meta, não o código. Comece cedo.

### 1. App e número

1. **developers.facebook.com** → *My Apps* → *Create App* → tipo **Business**.
2. Adicione o produto **WhatsApp**.
3. Em *API Setup* você recebe um número de teste e um **token temporário
   (24 h)** — serve para o primeiro teste.
4. Copie o **Phone number ID** (não é o telefone: é um ID numérico).

### 2. Token permanente

O token de 24 h quebra em produção. Para um definitivo:

1. **business.facebook.com** → *Configurações* → *Usuários* → *Usuários do sistema*.
2. Crie um usuário de sistema **Admin**.
3. *Adicionar ativos* → seu app WhatsApp → controle total.
4. *Gerar novo token* → permissões `whatsapp_business_messaging` e
   `whatsapp_business_management` → **Nunca expira**.

### 3. App Secret

*App Settings* → *Basic* → **App Secret** → *Show*.

**Obrigatório em produção**: sem ele o processo não sobe, porque sem validar a
assinatura qualquer um posta no seu webhook falando como se fosse um produtor.

### 4. `.env`

```
WHATSAPP_PROVIDER=meta
WHATSAPP_TOKEN=<token permanente>
WHATSAPP_PHONE_NUMBER_ID=<id numérico>
WHATSAPP_VERIFY_TOKEN=<string que VOCÊ inventa>
WHATSAPP_APP_SECRET=<app secret>
```

`WHATSAPP_VERIFY_TOKEN` é uma senha qualquer que você escolhe — ela só precisa
ser igual nos dois lados (aqui e no painel da Meta).

### 5. Apontar o webhook

```bash
npm run doctor      # confirme WhatsApp em OK antes de seguir
npm start
ngrok http 3000     # em outro terminal
```

No painel: *WhatsApp* → *Configuration* → *Edit*:

- **Callback URL**: `https://SEU-NGROK/webhook/whatsapp`
- **Verify token**: o mesmo do `.env`
- Assine o campo **`messages`**.

A Meta chama o `GET` na hora; se o token bater, ela salva. Mande uma mensagem
para o número de teste e acompanhe o log.

### 6. Produção

- Número próprio precisa de verificação do Business Manager (dias).
- Fora da janela de 24 h só se responde por **template aprovado** — vale para
  os alertas proativos, que precisarão de templates.
- Rode atrás de HTTPS real (`ngrok` é só para desenvolvimento).

---

## Deploy

```bash
docker compose up -d --build
```

Em Railway/Render/Fly.io: suba a imagem do `Dockerfile`, aponte
`DATABASE_URL`/`REDIS_URL` para os serviços gerenciados e rode
`npm run migrate` uma vez.

Checklist de produção:

- [ ] `NODE_ENV=production`
- [ ] `WHATSAPP_APP_SECRET` definido (o boot falha sem ele — de propósito)
- [ ] `npm run migrate` aplicado
- [ ] `npm run doctor` sem nenhum item bloqueante
- [ ] `/health` respondendo 200
- [ ] Uma instância só, ou mova o agendador BullMQ para um worker dedicado

---

## Custo por mensagem

Cada mensagem do produtor gasta uma volta do Claude mais as ferramentas que
ele chamar. O prompt estável vai em cache (`cache_control`), então mensagens
seguidas da mesma conversa custam bem menos que a primeira.

Controles já no código:

- `SEIVA_EFFORT=medium` (WhatsApp é sensível a latência; `low` corta mais)
- Teto de 6 voltas de ferramenta por mensagem
- Teto de 60 mensagens por produtor por hora
- Histórico limitado às últimas 30 mensagens

Para acompanhar o gasto real, olhe `cache_read_input_tokens` nos logs em
`LOG_LEVEL=debug`: se vier zero sempre, o cache não está pegando.
