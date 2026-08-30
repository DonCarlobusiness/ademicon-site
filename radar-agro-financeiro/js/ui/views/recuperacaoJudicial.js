import { mountOpportunityTable } from '../opportunityTable.js';

export function renderRecuperacaoJudicial(container) {
  return mountOpportunityTable(container, {
    title: 'Recuperação Judicial',
    description: 'Empresas com processo de recuperação judicial deferido ou pedido em tramitação, segundo fontes públicas.',
    presetFilter: (c) => String(c.signal).includes('Recuperação'),
    emptyIcon: '◎',
  });
}
