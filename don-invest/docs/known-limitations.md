# Limitações conhecidas — Fase 1

1. **Ações, FIIs, ETFs, REITs, renda fixa internacional e commodities não são pesquisados** — falta provedor licenciado (adaptador preparado em `quotes.ts`).
2. **CDB/RDB/LCI/LCA**: sem API pública confiável de ofertas; o usuário pode incluir ofertas manuais (não verificadas) e usar os pontos de equilíbrio.
3. **Tesouro Direto**: taxas e PUs da data-base publicada (D-1 útil), não do momento da compra. Regras de mínimo, custódia e Renda+ são catalogadas — não conferidas ao vivo (o backend não acessa tesourodireto.com.br).
4. **Kraken**: tabela de taxas não retornada pela API pública para BTC/ETH (09/11/2026); elegibilidade de brasileiros, depósito em BRL, câmbio e IOF não verificados. Preço em BRL é conversão indicativa pelo dólar do BCB.
5. **CVM**: somente disponibilidade do diretório; fundos não analisados.
6. **Cenários**: Selic/IPCA constantes (editáveis). Cupons semestrais tratados como reinvestidos (simplificação). Renda+ sem simulação de fluxo.
7. **Tributação**: apenas renda fixa regressiva, IOF e isenção da poupança. Cripto, ações, fundos e exterior não calculados.
8. **Sem mentor com IA, notícias, Supabase, autenticação, /diagnostico, /simulador e /academia** (Fases 2–3). Telas `/mentor`, `/diagnostico`, `/simulador`, `/academia` ainda não existem.
9. **Rate limit, cache e circuit breaker são em memória** (por instância).
10. **Exportação**: CSV e JSON; PDF via impressão do navegador.
11. Logo: `public/brand/don-invest.png` não existe no repositório; é usado logotipo tipográfico até a imagem ser adicionada.
