import { mountOpportunityTable } from '../opportunityTable.js';

export function renderRadar(container) {
  return mountOpportunityTable(container, {
    title: 'Oportunidades identificadas',
    description: 'Não classificamos automaticamente o passivo como “dívida rural” sem documentação ou evidência específica.',
    presetFilter: () => true,
  });
}
