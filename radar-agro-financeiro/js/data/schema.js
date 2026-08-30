/**
 * Modelo de dados do Radar Agro Financeiro.
 *
 * Esta camada roda hoje inteiramente no navegador (localStorage), mas o
 * formato dos objetos já espelha o modelo relacional alvo em
 * PostgreSQL/Supabase (ver README.md na raiz do projeto para o DDL completo):
 *
 *   companies, company_contacts, company_owners, financial_signals,
 *   data_sources, crm_leads, crm_interactions, imports, import_rows,
 *   audit_logs, search_jobs
 *
 * CNPJ nunca é tratado como número: é sempre string, preservando máscara
 * e preparado para o formato alfanumérico futuro da Receita Federal.
 */

/** Remove tudo que não for [0-9A-Z] — compatível com CNPJ numérico ou alfanumérico. */
export function normCnpj(v) {
  return String(v || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/** Aplica a máscara XX.XXX.XXX/XXXX-XX quando o valor for puramente numérico. */
export function formatCnpj(v) {
  const clean = normCnpj(v);
  if (clean.length !== 14 || !/^\d{14}$/.test(clean)) return v || '—';
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/** Validação do dígito verificador de CNPJ numérico (14 dígitos). CNPJs alfanuméricos futuros são aceitos sem checagem de DV. */
export function isValidCnpj(v) {
  const c = normCnpj(v);
  if (!c) return false;
  if (!/^\d{14}$/.test(c)) return c.length === 14; // alfanumérico: valida apenas o formato
  if (/^(\d)\1{13}$/.test(c)) return false;
  const calc = (base) => {
    let sum = 0, pos = base.length - 7;
    for (let i = base.length; i >= 1; i--) {
      sum += base[base.length - i] * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const digits = c.split('').map(Number);
  const dv1 = calc(digits.slice(0, 12));
  const dv2 = calc(digits.slice(0, 12).concat(dv1));
  return dv1 === digits[12] && dv2 === digits[13];
}

export const SIGNAL_TYPES = [
  'Recuperação Judicial',
  'Pedido de Recuperação Judicial',
  'Dívida Ativa da União',
  'Protesto de Título',
  'Processo Judicial (outro)',
  'Registro Importado',
];

export const CONFIDENCE_LEVELS = ['alta', 'media', 'baixa'];

export const CRM_STAGES = [
  'Novo Lead',
  'Contato Iniciado',
  'Interessado',
  'Diagnóstico Autorizado',
  'Documentos Solicitados',
  'Em Análise',
  'Encaminhado ao Parceiro',
  'Negociação',
  'Fechado',
  'Sem Interesse',
  'Não Contatar',
];

/**
 * Um passivo só pode ser exibido como "Dívida rural confirmada" quando
 * signal.confirmedRuralDebt === true E existe lastro documental
 * (signal.hasDocumentaryEvidence === true). Fora isso, é sempre tratado
 * como "sinal público de endividamento/reestruturação" — nunca inferido
 * automaticamente como dívida rural bancária.
 */
export function isConfirmedRuralDebt(company) {
  return !!(company.confirmedRuralDebt && company.hasDocumentaryEvidence);
}

export function emptyCompany() {
  return {
    id: '',
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    statusCadastral: 'ATIVA',
    municipio: '',
    uf: '',
    segmento: 'Base importada',
    cnaePrincipal: '',
    cnaesSecundarios: [],
    porte: '',
    capitalSocial: null,
    dataAbertura: '',
    responsavel: '',
    quadroSocietario: [],
    signal: 'Registro Importado',
    confirmedRuralDebt: false,
    hasDocumentaryEvidence: false,
    passivoDescricao: '',
    passivoValor: null,
    processos: [],
    telefone: '',
    whatsapp: '',
    email: '',
    site: '',
    source: { name: 'Planilha importada', url: '', collectedAt: '', publishedAt: '', confidence: 'baixa', dataType: 'importado' },
    score: 60,
    statusCrm: 'Novo Lead',
    crmResponsavel: '',
    ultimaInteracao: '',
    proximaAcao: '',
    notasCrm: '',
    historicoCrm: [],
    origem: 'importado',
    optOut: false,
    naoContatar: false,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}
