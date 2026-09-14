import type { Crop } from '../../domain/types.js';

/**
 * Parametros por cultura. Base: Boletim 100 (IAC), 5a Aproximacao (CFSEMG)
 * e recomendacoes Embrapa. Sao valores de referencia para orientacao —
 * a recomendacao final continua sendo do agronomo que assina.
 */
export interface CropParams {
  /** Peso da saca em kg. Culturas medidas em t/ha usam 1000. */
  bagKg: number;
  unitLabel: string;
  /** Produtividade tipica se o produtor nao informar meta. */
  defaultYield: number;
  /** Extracao/exportacao por tonelada de produto colhido (kg/t). */
  removal: { n: number; p2o5: number; k2o: number };
  /** Fixacao biologica cobre o N (leguminosas): nao recomendar N mineral. */
  fixesNitrogen: boolean;
  /** Saturacao por bases alvo para calagem (V2, %). */
  targetV: number;
  notesKey: string;
}

export const CROP_PARAMS: Record<Crop, CropParams> = {
  soja: {
    bagKg: 60, unitLabel: 'sacas/ha', defaultYield: 60,
    removal: { n: 51, p2o5: 14, k2o: 20 },
    fixesNitrogen: true, targetV: 60,
    notesKey: 'soja',
  },
  milho: {
    bagKg: 60, unitLabel: 'sacas/ha', defaultYield: 120,
    removal: { n: 17, p2o5: 8, k2o: 6 },
    fixesNitrogen: false, targetV: 60,
    notesKey: 'milho',
  },
  feijao: {
    bagKg: 60, unitLabel: 'sacas/ha', defaultYield: 35,
    removal: { n: 40, p2o5: 9, k2o: 20 },
    fixesNitrogen: false, targetV: 60,
    notesKey: 'feijao',
  },
  cafe: {
    bagKg: 60, unitLabel: 'sacas/ha', defaultYield: 35,
    removal: { n: 32, p2o5: 3, k2o: 36 },
    fixesNitrogen: false, targetV: 60,
    notesKey: 'cafe',
  },
  algodao: {
    bagKg: 15, unitLabel: 'arrobas/ha', defaultYield: 280,
    removal: { n: 35, p2o5: 13, k2o: 35 },
    fixesNitrogen: false, targetV: 60,
    notesKey: 'algodao',
  },
  trigo: {
    bagKg: 60, unitLabel: 'sacas/ha', defaultYield: 50,
    removal: { n: 25, p2o5: 10, k2o: 6 },
    fixesNitrogen: false, targetV: 60,
    notesKey: 'trigo',
  },
  cana: {
    bagKg: 1000, unitLabel: 't/ha', defaultYield: 80,
    removal: { n: 1.2, p2o5: 0.4, k2o: 2.0 },
    fixesNitrogen: false, targetV: 60,
    notesKey: 'cana',
  },
  pastagem: {
    bagKg: 1000, unitLabel: 't MS/ha', defaultYield: 12,
    removal: { n: 20, p2o5: 5, k2o: 18 },
    fixesNitrogen: false, targetV: 50,
    notesKey: 'pastagem',
  },
  hortalicas: {
    bagKg: 1000, unitLabel: 't/ha', defaultYield: 40,
    removal: { n: 3.0, p2o5: 1.2, k2o: 4.0 },
    fixesNitrogen: false, targetV: 75,
    notesKey: 'hortalicas',
  },
  outro: {
    bagKg: 60, unitLabel: 'sacas/ha', defaultYield: 50,
    removal: { n: 20, p2o5: 9, k2o: 15 },
    fixesNitrogen: false, targetV: 60,
    notesKey: 'outro',
  },
};

/** Fontes usadas para montar a formula. */
export const SOURCES = {
  ureia: { name: 'Ureia (45% N)', n: 0.45, p2o5: 0, k2o: 0 },
  map: { name: 'MAP (11% N, 52% P2O5)', n: 0.11, p2o5: 0.52, k2o: 0 },
  kcl: { name: 'Cloreto de potassio (60% K2O)', n: 0, p2o5: 0, k2o: 0.60 },
  calcario: { name: 'Calcario dolomitico (PRNT 85%)', n: 0, p2o5: 0, k2o: 0 },
} as const;
