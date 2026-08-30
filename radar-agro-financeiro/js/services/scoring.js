/**
 * Motor de score (0–100).
 *
 * O score nunca reflete "dívida rural confirmada" — ele mede a
 * PRIORIDADE DE INVESTIGAÇÃO de um registro com base em sinais públicos,
 * qualidade cadastral e disponibilidade de contato. Pesos documentados
 * abaixo somam no máximo 100 e são somados/clampados por
 * scoreCompany().
 */
const AGRO_KEYWORDS = ['agro', 'agrícola', 'agropecuár', 'grão', 'grãos', 'soja', 'milho', 'pecuár', 'bovin', 'agronomia', 'fertilizante', 'defensivo', 'insumo', 'rural', 'lavoura', 'cultivo', 'horticultura', 'silvicultura'];

const SIGNAL_WEIGHT = {
  'Recuperação Judicial': 25,
  'Pedido de Recuperação Judicial': 20,
  'Dívida Ativa da União': 16,
  'Protesto de Título': 12,
  'Processo Judicial (outro)': 10,
  'Registro Importado': 6,
};

const SOURCE_WEIGHT = { alta: 10, media: 6, baixa: 3 };

function agroFit(company) {
  const hay = `${company.segmento || ''} ${company.cnaeDescricao || ''} ${company.cnaePrincipal || ''}`.toLowerCase();
  const hits = AGRO_KEYWORDS.filter((k) => hay.includes(k)).length;
  return Math.min(20, hits * 7 + (hits > 0 ? 6 : 0));
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / 86400000;
}

export function scoreCompany(company) {
  let score = 0;

  score += agroFit(company); // até 20
  score += SIGNAL_WEIGHT[company.signal] ?? 5; // até 25

  if (company.statusCadastral === 'ATIVA') score += 15; // empresa ativa

  if (company.passivoValor && Number(company.passivoValor) > 0) score += 10;
  else if (company.passivoDescricao) score += 3;

  if (company.responsavel) score += 6;
  if (company.telefone) score += 6;
  if (company.email) score += 6;
  // (contato empresarial completo soma até 18)

  const age = daysSince(company.updatedAt);
  if (age <= 30) score += 10;
  else if (age <= 90) score += 6;
  else if (age <= 365) score += 2;

  score += SOURCE_WEIGHT[company.source?.confidence] ?? 3; // até 10

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreTier(score) {
  if (score >= 90) return { key: 'tier-max', label: 'Prioridade Máxima' };
  if (score >= 75) return { key: 'tier-high', label: 'Alta' };
  if (score >= 50) return { key: 'tier-med', label: 'Média' };
  return { key: 'tier-low', label: 'Baixa' };
}
