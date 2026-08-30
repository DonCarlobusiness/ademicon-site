import { mountOpportunityTable } from '../opportunityTable.js';

export function renderCompanies(container) {
  return mountOpportunityTable(container, {
    title: 'Empresas monitoradas',
    description: 'Todas as empresas do radar — pesquisadas ou importadas — com dados cadastrais e situação atual.',
    presetFilter: () => true,
    emptyIcon: '▦',
  });
}
