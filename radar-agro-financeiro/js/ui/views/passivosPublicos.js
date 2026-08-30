import { mountOpportunityTable } from '../opportunityTable.js';

export function renderPassivosPublicos(container) {
  return mountOpportunityTable(container, {
    title: 'Passivos Públicos',
    description: 'Registros com passivo, dívida ativa ou outro evento financeiro público documentado — antes de qualquer confirmação de natureza rural.',
    presetFilter: (c) => !!(c.passivoDescricao || c.passivoValor || String(c.signal).includes('Dívida Ativa') || String(c.signal).includes('Protesto')),
    emptyIcon: '⌁',
  });
}
