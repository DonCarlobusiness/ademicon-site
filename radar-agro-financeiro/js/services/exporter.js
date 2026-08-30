import { formatCnpj, isConfirmedRuralDebt } from '../data/schema.js';

const COLUMNS = [
  ['Score', (c) => c.score],
  ['Empresa', (c) => c.razaoSocial],
  ['CNPJ', (c) => formatCnpj(c.cnpj)],
  ['Município', (c) => c.municipio || ''],
  ['UF', (c) => c.uf || ''],
  ['Segmento', (c) => c.segmento || ''],
  ['CNAE', (c) => c.cnaePrincipal || ''],
  ['Sinal Identificado', (c) => c.signal || ''],
  ['Dívida Rural Confirmada', (c) => (isConfirmedRuralDebt(c) ? 'Sim' : 'Não')],
  ['Passivo Conhecido', (c) => c.passivoDescricao || ''],
  ['Responsável', (c) => c.responsavel || ''],
  ['Telefone', (c) => c.telefone || ''],
  ['E-mail', (c) => c.email || ''],
  ['Fonte', (c) => c.source?.name || ''],
  ['URL da Fonte', (c) => c.source?.url || ''],
  ['Atualização', (c) => c.updatedAt || ''],
  ['Status CRM', (c) => c.statusCrm || ''],
];

function buildRows(companies) {
  return companies.map((c) => Object.fromEntries(COLUMNS.map(([label, get]) => [label, get(c)])));
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export function exportCSV(companies, filename = 'radar_agro_financeiro.csv') {
  const rows = buildRows(companies);
  const headers = COLUMNS.map(([label]) => label);
  const csv = [headers, ...rows.map((r) => headers.map((h) => r[h]))]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), filename);
}

export function exportXLSX(companies, filename = 'Radar_Agro_Financeiro.xlsx') {
  if (typeof XLSX === 'undefined') {
    throw new Error('Para exportar em .xlsx, verifique sua conexão. Você ainda pode usar "Exportar CSV".');
  }
  const rows = buildRows(companies);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Radar Agro');
  XLSX.writeFile(wb, filename);
}
