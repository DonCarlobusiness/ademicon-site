/**
 * Onde consultar/contratar — somente páginas oficiais. Nenhum link foi acessado pelo
 * backend nesta versão (linkCheckedBySystem = false): os hosts não estão na allowlist de coleta.
 */
import type { WhereToCheck } from "../analysis/types";

const off = (label: string, url: string): WhereToCheck => ({ label, url, kind: "oficial", linkCheckedBySystem: false });

export const WHERE = {
  tesouro: [
    off("Tesouro Direto — site oficial (preços, taxas e simulador)", "https://www.tesourodireto.com.br/"),
    off("Tesouro Transparente — dados oficiais usados nesta pesquisa", "https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto"),
  ],
  bancos: [
    off("Banco Central — encontre instituições autorizadas", "https://www.bcb.gov.br/estabilidadefinanceira/encontreinstituicao"),
    off("FGC — garantia e instituições associadas", "https://www.fgc.org.br/"),
  ],
  poupanca: [off("Banco Central — regras da poupança", "https://www.bcb.gov.br/estabilidadefinanceira/poupanca")],
  kraken: [off("Kraken — site oficial", "https://www.kraken.com/"), off("CVM — alertas sobre ofertas irregulares", "https://www.gov.br/cvm/pt-br")],
  b3: [off("B3 — site oficial", "https://www.b3.com.br/")],
};
