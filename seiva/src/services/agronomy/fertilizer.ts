import type {
  Crop, FertilizerPlan, FertilizerProduct, SoilAnalysis, ToolResult,
} from '../../domain/types.js';
import { CROP_PARAMS, SOURCES } from './cropParams.js';

/**
 * Calculadora de adubacao NPK + calagem.
 *
 * Metodo: balanco de nutrientes (extracao pela meta de produtividade)
 * corrigido pela classe de disponibilidade do solo. Calagem pelo metodo
 * da saturacao por bases. Referencias: Boletim 100 (IAC) e 5a Aproximacao
 * (CFSEMG). Sem laudo, cai para estimativa regional e marca isso no plano —
 * o produtor precisa saber que o numero e menos confiavel.
 */

export type AvailabilityClass = 'muito_baixo' | 'baixo' | 'medio' | 'alto' | 'muito_alto';

/**
 * Fator aplicado sobre a extracao. Abaixo de 'medio' aduba-se acima da
 * exportacao para construir fertilidade; acima, so manutencao.
 */
const CLASS_FACTOR: Record<AvailabilityClass, number> = {
  muito_baixo: 2.0,
  baixo: 1.5,
  medio: 1.0,
  alto: 0.7,
  muito_alto: 0.4,
};

/**
 * Interpretacao de P (Mehlich-1) depende da argila: solo argiloso fixa mais
 * fosforo, entao o mesmo teor "vale menos". Faixas da 5a Aproximacao.
 */
export function classifyPhosphorus(pMehlich: number, clayPct = 35): AvailabilityClass {
  let limits: [number, number, number, number];
  if (clayPct > 60) limits = [2.7, 5.4, 8.0, 12.0];
  else if (clayPct > 35) limits = [4.0, 8.0, 12.0, 18.0];
  else if (clayPct > 15) limits = [6.6, 12.0, 20.0, 30.0];
  else limits = [10.0, 20.0, 30.0, 45.0];

  if (pMehlich <= limits[0]) return 'muito_baixo';
  if (pMehlich <= limits[1]) return 'baixo';
  if (pMehlich <= limits[2]) return 'medio';
  if (pMehlich <= limits[3]) return 'alto';
  return 'muito_alto';
}

/** K em mg/dm3 (Mehlich-1). */
export function classifyPotassium(k: number): AvailabilityClass {
  if (k <= 25) return 'muito_baixo';
  if (k <= 50) return 'baixo';
  if (k <= 80) return 'medio';
  if (k <= 120) return 'alto';
  return 'muito_alto';
}

/**
 * Calagem pelo metodo da saturacao por bases:
 *   NC (t/ha) = (V2 - V1) x T / 100, corrigido pelo PRNT.
 * T = CTC a pH 7 (cmolc/dm3).
 */
export function limingNeed(
  soil: SoilAnalysis, targetV: number, prnt = 85,
): { needed: boolean; tHa: number; note: string } {
  const { ctc, baseSaturation } = soil;
  if (ctc === undefined || baseSaturation === undefined) {
    return { needed: false, tHa: 0, note: 'sem_dados_calagem' };
  }
  if (baseSaturation >= targetV) {
    return { needed: false, tHa: 0, note: 'saturacao_adequada' };
  }
  const raw = ((targetV - baseSaturation) * ctc) / 100;
  const corrected = raw * (100 / prnt);
  return {
    needed: corrected >= 0.3,
    tHa: Math.round(corrected * 10) / 10,
    note: 'saturacao_bases',
  };
}

export interface FertilizerInput {
  crop: Crop;
  areaHa: number;
  targetYield?: number;
  soil?: SoilAnalysis | null;
  /** Preco por tonelada de cada fonte, para estimar custo. */
  prices?: { ureia?: number; map?: number; kcl?: number; calcario?: number };
}

export function calculateFertilizer(input: FertilizerInput): ToolResult<FertilizerPlan> {
  const { crop, areaHa } = input;
  if (!(areaHa > 0)) return { ok: false, reason: 'invalid_input', detail: 'area deve ser maior que zero' };

  const params = CROP_PARAMS[crop] ?? CROP_PARAMS.outro;
  const targetYield = input.targetYield && input.targetYield > 0 ? input.targetYield : params.defaultYield;
  const soil = input.soil ?? null;
  const basis: FertilizerPlan['basis'] = soil ? 'soil_analysis' : 'regional_estimate';

  // Meta em toneladas de produto colhido.
  const yieldT = (targetYield * params.bagKg) / 1000;

  // Sem laudo assumimos fertilidade media — e o cenario mais comum no
  // Cerrado corrigido e nao superestima adubo.
  const pClass = soil?.pMehlich !== undefined
    ? classifyPhosphorus(soil.pMehlich, soil.clayPct ?? 35)
    : 'medio';
  const kClass = soil?.k !== undefined ? classifyPotassium(soil.k) : 'medio';

  // --- N ---
  let n = 0;
  const notes: string[] = [];
  if (params.fixesNitrogen) {
    notes.push('n_fixacao_biologica');
  } else {
    n = params.removal.n * yieldT;
    // Materia organica mineraliza N ao longo do ciclo: ~20 kg N/ha por 1% de MO.
    if (soil?.om !== undefined) {
      const fromOm = soil.om * 20;
      n = Math.max(0, n - fromOm);
      notes.push('n_descontado_mo');
    }
  }

  // --- P e K ---
  const p2o5 = params.removal.p2o5 * yieldT * CLASS_FACTOR[pClass];
  const k2o = params.removal.k2o * yieldT * CLASS_FACTOR[kClass];

  const nutrients = {
    n: Math.round(n),
    p2o5: Math.round(p2o5),
    k2o: Math.round(k2o),
  };

  // --- Fontes ---
  // MAP primeiro (carrega N junto), ureia cobre o N que faltar, KCl fecha o K.
  const products: FertilizerProduct[] = [];
  const mapKg = nutrients.p2o5 > 0 ? nutrients.p2o5 / SOURCES.map.p2o5 : 0;
  const nFromMap = mapKg * SOURCES.map.n;
  const ureiaKg = Math.max(0, (nutrients.n - nFromMap) / SOURCES.ureia.n);
  const kclKg = nutrients.k2o > 0 ? nutrients.k2o / SOURCES.kcl.k2o : 0;

  if (mapKg > 0) {
    products.push(mk(SOURCES.map.name, mapKg, areaHa, 'no plantio, no sulco'));
  }
  if (ureiaKg > 0) {
    products.push(mk(SOURCES.ureia.name, ureiaKg, areaHa, 'em cobertura, parcelado em 2 vezes'));
  }
  if (kclKg > 0) {
    // Acima de 80 kg/ha de KCl no sulco salino demais: parcelar.
    const timing = kclKg > 80 ? 'metade no plantio, metade em cobertura' : 'no plantio';
    products.push(mk(SOURCES.kcl.name, kclKg, areaHa, timing));
  }

  const liming = soil
    ? limingNeed(soil, params.targetV)
    : { needed: false, tHa: 0, note: 'sem_laudo' };

  if (liming.needed) {
    products.push(mk(SOURCES.calcario.name, liming.tHa * 1000, areaHa, 'de 60 a 90 dias antes do plantio'));
  }

  if (!soil) notes.push('sem_laudo_estimativa_regional');
  if (pClass === 'muito_baixo' || kClass === 'muito_baixo') notes.push('fertilidade_muito_baixa');

  return {
    ok: true,
    data: {
      crop,
      targetYield,
      areaHa,
      basis,
      nutrients,
      liming,
      products,
      totalCost: estimateCost(products, input.prices),
      notes,
    },
  };
}

function mk(name: string, kgPerHa: number, areaHa: number, timing: string): FertilizerProduct {
  // O total sai do valor JA arredondado de propósito. O produtor le
  // "112 kg/ha" e "2.800 kg" na mesma mensagem e faz a conta de cabeca —
  // se os dois numeros nao batirem ele desconfia do resto da recomendacao.
  const perHa = Math.round(kgPerHa);
  return {
    name,
    kgPerHa: perHa,
    totalKg: Math.round(perHa * areaHa),
    timing,
  };
}

function estimateCost(
  products: FertilizerProduct[],
  prices: FertilizerInput['prices'],
): number | null {
  if (!prices) return null;
  const byKey: Record<string, number | undefined> = {
    [SOURCES.ureia.name]: prices.ureia,
    [SOURCES.map.name]: prices.map,
    [SOURCES.kcl.name]: prices.kcl,
    [SOURCES.calcario.name]: prices.calcario,
  };
  let total = 0;
  let known = false;
  for (const p of products) {
    const pricePerTon = byKey[p.name];
    if (pricePerTon === undefined) continue;
    known = true;
    total += (p.totalKg / 1000) * pricePerTon;
  }
  return known ? Math.round(total * 100) / 100 : null;
}
