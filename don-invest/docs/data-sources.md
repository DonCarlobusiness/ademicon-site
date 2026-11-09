# Fontes de dados — DON INVEST

Validação ao vivo feita em **09/11/2026** a partir do ambiente de desenvolvimento (evidências no README).

| Fonte | Status Fase 1 | Endpoint | Método | Frescor esperado |
|---|---|---|---|---|
| Banco Central — SGS | **Integrado e testado ao vivo** | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json&dataInicial=dd/mm/aaaa&dataFinal=dd/mm/aaaa` | API oficial pública | Diária D-1 útil; IPCA mensal com ~1–2 meses de defasagem |
| Kraken — dados públicos | **Integrado e testado ao vivo** | `https://api.kraken.com/0/public/Ticker`, `/AssetPairs`, `/OHLC` | API pública da exchange | Tempo real (Ticker sem timestamp próprio: referência = coleta) |
| Tesouro Transparente (Tesouro Direto) | **Integrado e testado ao vivo** | CSV “Taxas dos Títulos Ofertados pelo Tesouro Direto” (CKAN, licença ODbL) | Publicação oficial | Data-base D-1 útil (não é cotação em tempo real) |
| CVM Dados Abertos | Disponibilidade verificada | `https://dados.cvm.gov.br/dados/FI/CAD/DADOS/` | Publicação oficial | Fase 2: cadastro e informes diários de fundos |
| Ações/FIIs/ETFs/REITs | **Não integrado** (adaptador vazio) | — | Requer provedor licenciado | — |
| CDB/RDB/LCI/LCA | **Não integrado** | — | Entrada manual marcada como não verificada | — |

## Banco Central — catálogo de séries

| Chave | Código SGS | Descrição | Observação |
|---|---|---|---|
| selic_meta | 432 | Meta Selic (Copom), % a.a. | **Publica datas futuras** (meta vigente adiante). O conector usa intervalo de datas e descarta pontos futuros. Com `/ultimos/N` a série retornaria só o futuro — bug encontrado e corrigido durante a validação. |
| selic_efetiva | 1178 | Selic anualizada base 252 | Base dos cenários pós-fixados |
| cdi | 4389 | CDI anualizado base 252 | A API não garante ordem: o conector ordena |
| ipca_mensal | 433 | IPCA % a.m. | |
| ipca_12m | 13522 | IPCA acumulado 12 meses | Base da hipótese de inflação |
| usdbrl | 1 | Dólar comercial venda | Conversão **indicativa** de preços em USD |
| poupanca | 195 | Rentabilidade da poupança (depósitos a partir de 04/05/2012) | Campo `dataFim` preservado |

Limites: o BCB limita consultas de séries diárias a janelas de até 10 anos e `/ultimos/N` a N ≤ 20.

## Kraken

- Somente endpoints públicos. Nenhuma chave, conta, ordem ou saque.
- Mapeamento explícito de pares (`XBTUSD` → chave `XXBTZUSD`), sem presumir que identificadores coincidam.
- `AssetPairs` fornece `ordermin`, `costmin`, `status` e, quando disponível, tabela de taxas. Em 09/11/2026 o campo `fees` veio **vazio** para XBTUSD → o relatório mostra “não verificado”.
- `OHLC` diário (até 720 velas) → volatilidade anualizada e maior queda (histórico, nunca previsão).
- Elegibilidade de residentes no Brasil, depósito em BRL e custos de câmbio: **não verificados**.

## Tesouro Transparente

- URL do recurso CSV: ver `src/lib/market-data/tesouro.ts` (`TESOURO_CSV_URL`), ~15 MB, separador `;`, decimais com vírgula, ordenado da data mais recente para a mais antiga.
- O conector lê em *stream* e para ao encontrar data-base anterior à mais recente (≈1–2 s em vez de baixar o arquivo inteiro).
- Cabeçalho é validado; mudança de formato gera erro explícito.
- `PU Compra` zerado indica título não ofertado.
- **Não** fazemos scraping de tesourodireto.com.br (o host não é acessado pelo backend).

## Ações, FIIs, ETFs, REITs — opções de integração

Não existe API pública oficial e gratuita da B3 para cotações. Opções (custos e termos devem ser conferidos no momento da contratação):

| Provedor | Cobertura | Observações |
|---|---|---|
| B3 Market Data / UP2DATA | B3 oficial | Licenciamento comercial; custo elevado; redistribuição regulada |
| brapi.dev | B3 (ações, FIIs, ETFs) | Plano gratuito limitado e planos pagos; token obrigatório |
| Twelve Data / Polygon / Alpha Vantage | EUA e outros | Atraso de 15 min em planos básicos; termos de redistribuição |

Para integrar: implementar `QuoteProvider` em `src/lib/market-data/quotes.ts`, adicionar o host em `ALLOWED_HOSTS` e configurar `QUOTES_PROVIDER` / `QUOTES_API_KEY` no servidor.

## Proteções do coletor

- Allowlist de hosts e somente HTTPS (`assertAllowedUrl`).
- Timeout por requisição, até 2 retries com backoff exponencial (não repete 4xx), circuit breaker (3 falhas → aberto por 60 s), cache em memória com TTL (BCB 30 min, Kraken ticker 60 s, Tesouro 2 h).
- Validação de schema (Zod) em todas as respostas; texto de fonte externa nunca é interpretado como instrução.
- Suporte a proxy corporativo via `HTTPS_PROXY` (undici `EnvHttpProxyAgent`).
