# Metodologia — DON INVEST

## Fluxo

1. **Orchestrator** valida a entrada (Zod), interpreta a pergunta, define escopo e um **perfil preliminar** (não é suitability certificada).
2. **Conectores** (BCB, Tesouro Transparente, Kraken, CVM) rodam em paralelo; falhas individuais geram resultado parcial.
3. **Macro Intelligence** monta indicadores observados e as **hipóteses editáveis** (Selic/CDI/IPCA constantes, ou valores do usuário).
4. **Fixed Income Research** seleciona títulos ofertados (Selic mais curto; Prefixado curto/~3 anos/mais longo; IPCA+ curto/~10 anos; IPCA+ com juros ~10 anos; Renda+ mais próximo), poupança e ofertas manuais.
5. **Global Markets Research** monta BTC e ETH (Kraken) e lista classes sem fonte.
6. **Broker & Cost Analyst** compara plataformas, marcando cada campo como verificado (API), regra catalogada ou não verificado.
7. **Risk Guardian** aplica vetos e alertas por horizonte.
8. Cenários e **matriz de aderência** são calculados por funções puras.
9. **Evidence Auditor** cruza fontes, confere frescor e aritmética, remove afirmações sem fonte primária.
10. **Síntese determinística** escreve resumo e conclusões a partir dos dados auditados (sem LLM).

## Horizontes

| Horizonte | Dias usados em cenários pós-fixados | Foco |
|---|---|---|
| Curto | 365 | Segurança, liquidez, preservação |
| Médio | 1095 | Casamento vencimento × prazo |
| Longo | 3650 | Diversificação e renda futura |
| Indefinido | 730 | Conclusões condicionadas |

Títulos prefixados/IPCA+ são simulados **até o vencimento** (único caso em que a taxa contratada é preservada).

## Matriz de aderência (0–100 por dimensão)

Dimensões: segurança do principal, liquidez, custo, adequação ao prazo, retorno líquido real (cenário), exposição cambial e confiabilidade dos dados. Pesos padrão por horizonte em `src/lib/analysis/scoring.ts`, editáveis pelo usuário e normalizados.

- Quando não há cenário de retorno (cripto), a dimensão é **excluída** e os pesos redistribuídos — não projetamos retorno especulativo.
- Pós-fixados em horizontes > 2 anos recebem −20 em retorno, pois dependem de taxa atual constante, não de taxa contratada.
- A nota é de **aderência ao perfil informado**, nunca um ranking universal.

## Vetos (Risk Guardian)

- Mínimo de aplicação acima do capital.
- Cripto: curto prazo; sem reserva de emergência; necessidade de resgate imediato; usuário que “venderia tudo”; queda histórica máxima > perda tolerável.
- Renda+ fora do longo prazo ou com previsão de resgate.
- Prefixado/IPCA+ com vencimento > 2× o horizonte curto; resgate imediato com marcação a mercado relevante.

## Regras financeiras (funções puras com testes)

- Juros compostos, conversão de taxas (anual ↔ mensal ↔ diária 252), indexador + spread, taxa real (Fisher).
- IR regressivo de renda fixa (Lei 11.033/2004): 22,5% (≤180 d), 20% (181–360), 17,5% (361–720), 15% (>720). **1 ano = 365 dias = 17,5%.**
- IOF regressivo (< 30 dias) sobre rendimento, antes do IR.
- Poupança: isenta de IR para PF. Cripto: **tributação não calculada**.
- Custódia B3 do Tesouro: 0,20% a.a.; Tesouro Selic isento até R$ 10 mil (regra catalogada).
- Mínimo do Tesouro: 1% do PU respeitando R$ 30 (frações de 1%).
- Faixa ilustrativa de ativos voláteis: log-normal com volatilidade histórica e retorno esperado zero (~90%).

## Renda passiva

Renda passiva **não é** necessariamente renda mensal: cupons do Tesouro são semestrais; Renda+ paga mensalmente apenas no futuro; dividendos/proventos não têm frequência ou valor garantidos; variação de preço pode superar os rendimentos.

## Simulador e projeções com aportes

- Taxa mensal: i = (1+r)^(1/12) − 1. Patrimônio: FV = P·(1+i)^n + A·((1+i)^n − 1)/i, aporte no fim de cada mês; com i = 0, FV = P + A·n.
- Total investido = P + A·n; lucro bruto = FV − total investido; poder de compra = FV / (1+inflação)^(n/12).
- O núcleo não arredonda; centavos só na apresentação.
- Impostos: “não calculados” por padrão. Com a regra de renda fixa, o IR regressivo é aplicado **por lote** (cada aporte tem seu prazo e alíquota) e o IOF vale para lotes com menos de 30 dias. Isento: líquido = bruto. O líquido só aparece quando os impostos são calculados.
- Renda passiva: a simulação genérica não distribui renda. O “plano de retiradas” opcional mostra o saque mensal que preserva o poder de compra (rendimento real), rotulado como saque, não como pagamento do produto.
- Cenários estressado/conservador/intermediário/otimista são taxas ilustrativas editáveis, não probabilidades.

### Projeções por produto na pesquisa

| Produto | Como é projetado |
|---|---|
| Tesouro Selic, poupança, ofertas em % do CDI | Capital + aportes à taxa atual mantida constante (hipótese), IR por lote, custódia quando aplicável |
| Prefixado / IPCA+ antes do vencimento | **Não calculado** — resgate seria a preço de mercado |
| Prefixado / IPCA+ no vencimento | Só o capital inicial à taxa da data-base; aportes não modelados (taxa futura desconhecida) |
| IPCA+ com juros semestrais, Renda+ | Não modelado (fluxo de cupons/renda exige VNA e cronograma) |
| Cripto | Faixa ilustrativa sobre o capital inicial (volatilidade histórica, retorno esperado zero) |
