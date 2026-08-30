import { normCnpj, isValidCnpj } from '../data/schema.js';

/** Campos do modelo que a importação consegue preencher, com rótulos amigáveis. */
export const IMPORT_FIELDS = [
  { key: 'cnpj', label: 'CNPJ', required: true },
  { key: 'razaoSocial', label: 'Razão Social / Empresa', required: true },
  { key: 'municipio', label: 'Cidade / Município' },
  { key: 'uf', label: 'UF' },
  { key: 'cnaePrincipal', label: 'CNAE' },
  { key: 'segmento', label: 'Segmento' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'E-mail' },
  { key: 'passivoDescricao', label: 'Passivo / Observações de dívida' },
  { key: 'notasCrm', label: 'Observações gerais' },
];

const HEURISTICS = {
  cnpj: ['cnpj'],
  razaoSocial: ['razao social', 'razaosocial', 'empresa', 'nome fantasia', 'nomefantasia', 'nome'],
  municipio: ['municipio', 'cidade'],
  uf: ['uf', 'estado'],
  cnaePrincipal: ['cnae', 'atividade'],
  segmento: ['segmento', 'setor'],
  telefone: ['telefone', 'fone', 'celular'],
  whatsapp: ['whatsapp', 'whats'],
  email: ['email', 'e-mail'],
  passivoDescricao: ['passivo', 'divida', 'dívida', 'valor'],
  notasCrm: ['observa', 'nota', 'obs'],
};

function stripAccents(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function autoDetectMapping(headers) {
  const mapping = {};
  const normalizedHeaders = headers.map((h) => ({ raw: h, norm: stripAccents(h) }));
  for (const field of IMPORT_FIELDS) {
    const candidates = HEURISTICS[field.key] || [];
    const found = normalizedHeaders.find((h) => candidates.some((c) => h.norm.includes(c)));
    mapping[field.key] = found ? found.raw : '';
  }
  return mapping;
}

export async function parseFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    if (!lines.length) return { headers: [], rows: [] };
    const sep = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
    const headers = lines[0].split(sep).map((h) => h.replace(/^"|"$/g, '').trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(sep).map((v) => v.replace(/^"|"$/g, '').trim());
      const obj = {};
      headers.forEach((h, i) => (obj[h] = values[i] ?? ''));
      return obj;
    });
    return { headers, rows };
  }

  if (typeof XLSX === 'undefined') {
    throw new Error('Biblioteca de planilhas ainda não carregou. Verifique sua conexão e tente novamente, ou use um arquivo CSV.');
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

/**
 * Converte uma linha da planilha em um PATCH parcial — apenas os campos
 * que o usuário efetivamente mapeou ficam preenchidos; o resto fica
 * vazio de propósito. Isso é essencial para o merge: um campo vazio
 * nunca sobrescreve um campo já preenchido na base (ver store.js →
 * mergePreferBetter). Sem isso, importar uma planilha sem coluna
 * "Segmento" apagaria o segmento/sinal já pesquisado de uma empresa
 * existente.
 */
export function rowToCompany(row, mapping) {
  const get = (field) => (mapping[field] ? String(row[mapping[field]] ?? '').trim() : '');
  return {
    cnpj: get('cnpj'),
    razaoSocial: get('razaoSocial'),
    nomeFantasia: get('razaoSocial'),
    municipio: get('municipio'),
    uf: get('uf').toUpperCase().slice(0, 2),
    segmento: get('segmento'),
    cnaePrincipal: get('cnaePrincipal'),
    cnaeDescricao: get('cnaePrincipal'),
    passivoDescricao: get('passivoDescricao'),
    telefone: get('telefone'),
    whatsapp: get('whatsapp'),
    email: get('email'),
    notasCrm: get('notasCrm'),
    origem: 'importado',
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

/** Preenche valores padrão só usados quando o CNPJ é inédito na base (não existe registro para complementar). */
function withNewCompanyDefaults(patch) {
  const defaults = {
    statusCadastral: 'ATIVA',
    segmento: 'Base importada',
    signal: 'Registro Importado',
    confirmedRuralDebt: false,
    hasDocumentaryEvidence: false,
    passivoValor: null,
    source: { name: 'Planilha importada', url: '', collectedAt: new Date().toISOString().slice(0, 10), publishedAt: '', confidence: 'baixa', dataType: 'importado' },
    statusCrm: 'Novo Lead',
    razaoSocial: 'Empresa importada',
  };
  const out = { ...defaults, ...patch };
  // Uma string vazia no patch não deve apagar o default (só valores mapeados de fato substituem).
  for (const key of Object.keys(defaults)) {
    if (patch[key] === '') out[key] = defaults[key];
  }
  return out;
}

/**
 * Processa as linhas cruas com o mapeamento escolhido pelo usuário e
 * devolve tanto os registros prontos para mesclar quanto um relatório
 * ("324 importadas / 117 atualizadas / 23 duplicadas / 8 com erro").
 */
export function processImport(rows, mapping, existingCompanies) {
  const existingByCnpj = new Map(existingCompanies.map((c) => [normCnpj(c.cnpj), c]));
  const seenInFile = new Set();
  const report = { total: rows.length, imported: 0, updated: 0, duplicated: 0, errors: 0, errorDetails: [] };
  const toMerge = [];

  rows.forEach((row, idx) => {
    const patch = rowToCompany(row, mapping);
    const key = normCnpj(patch.cnpj);

    if (!key || !isValidCnpj(key)) {
      report.errors += 1;
      report.errorDetails.push({ line: idx + 2, reason: !key ? 'CNPJ ausente' : 'CNPJ inválido', raw: patch.cnpj });
      return;
    }
    if (seenInFile.has(key)) {
      report.duplicated += 1;
      return;
    }
    seenInFile.add(key);

    const isNew = !existingByCnpj.has(key);
    if (isNew) report.imported += 1;
    else report.updated += 1;

    toMerge.push(isNew ? withNewCompanyDefaults(patch) : patch);
  });

  return { toMerge, report };
}
