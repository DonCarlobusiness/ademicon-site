export type Locale = 'pt-BR' | 'es-419' | 'en';

export type Crop =
  | 'soja' | 'milho' | 'cafe' | 'algodao' | 'feijao'
  | 'trigo' | 'cana' | 'pastagem' | 'hortalicas' | 'outro';

export interface Producer {
  id: string;
  waId: string;              // telefone E.164 sem '+'
  name: string | null;
  municipality: string | null;
  uf: string | null;
  locale: Locale;
  lgpdConsentAt: Date | null;
  onboardingStep: OnboardingStep;
  /** Estado transitorio do onboarding, persistido entre mensagens. */
  onboardingData: OnboardingData;
  createdAt: Date;
}

export interface OnboardingData {
  pendingLat?: number;
  pendingLon?: number;
  pendingCrop?: Crop;
}

export type OnboardingStep = 'consent' | 'name' | 'location' | 'crop' | 'area' | 'done';

/** Talhao. `geom` e um polygon GeoJSON; quando o produtor so mandou o pin,
 *  guardamos o ponto em `centroid` e derivamos um buffer circular pela area. */
export interface Field {
  id: string;
  producerId: string;
  name: string;
  crop: Crop;
  areaHa: number;
  centroid: LatLon;
  geom: GeoJSONPolygon | null;
  plantedAt: Date | null;
}

export interface LatLon { lat: number; lon: number }

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // [lon, lat]
}

export type InboundKind = 'text' | 'audio' | 'image' | 'location' | 'document' | 'unsupported';

export interface InboundMessage {
  providerMessageId: string;
  waId: string;
  kind: InboundKind;
  text: string | null;
  mediaId: string | null;
  mimeType: string | null;
  location: LatLon | null;
  timestamp: Date;
  profileName: string | null;
}

/**
 * Resultado de ferramenta. Discriminado de proposito: uma falha vira texto
 * honesto para o modelo ("nao houve passagem sem nuvem"), nunca um numero
 * inventado. Ferramentas NAO lancam.
 */
export type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ToolFailureReason; detail?: string };

export type ToolFailureReason =
  | 'no_clear_pass'      // satelite: sem passagem sem nuvem na janela
  | 'no_field'           // produtor ainda nao cadastrou talhao
  | 'not_configured'     // credencial da integracao ausente
  | 'upstream_error'
  | 'no_data'
  | 'invalid_input';

export interface NdviResult {
  index: 'NDVI' | 'NDRE';
  acquiredAt: string;        // ISO date da passagem realmente usada
  cloudCover: number;        // 0..1 da cena usada
  mean: number;
  min: number;
  max: number;
  stdev: number;
  /** Serie das passagens limpas anteriores, mais nova primeiro. */
  history: { date: string; mean: number }[];
  pngPath: string | null;    // mapa renderizado para enviar no WhatsApp
}

export interface WeatherResult {
  latitude: number;
  longitude: number;
  timezone: string;
  daily: WeatherDay[];
  /** Janelas calculadas a partir da previsao (aplicacao/plantio/colheita). */
  sprayWindows: SprayWindow[];
}

export interface WeatherDay {
  date: string;
  tMinC: number;
  tMaxC: number;
  rainMm: number;
  rainProb: number;
  windKmh: number;
  humidityPct: number;
  et0Mm: number | null;
}

export interface SprayWindow {
  date: string;
  suitable: boolean;
  reasons: string[];
}

export interface SoilAnalysis {
  phCaCl2?: number;
  om?: number;          // materia organica %
  pMehlich?: number;    // mg/dm3
  k?: number;           // mg/dm3
  ca?: number;          // cmolc/dm3
  mg?: number;
  ctc?: number;         // cmolc/dm3
  baseSaturation?: number; // V%
  clayPct?: number;
}

export interface FertilizerPlan {
  crop: Crop;
  targetYield: number;      // sacas/ha (ou t/ha em pastagem)
  areaHa: number;
  basis: 'soil_analysis' | 'regional_estimate';
  nutrients: { n: number; p2o5: number; k2o: number }; // kg/ha
  liming: { needed: boolean; tHa: number; note: string };
  products: FertilizerProduct[];
  totalCost: number | null;
  notes: string[];
}

export interface FertilizerProduct {
  name: string;
  kgPerHa: number;
  totalKg: number;
  timing: string;
}

export interface MarketPrice {
  crop: Crop;
  region: string;
  unit: string;
  price: number;
  currency: string;
  referenceDate: string;
  source: string;
}

export interface PhotoDiagnosis {
  label: string;
  category: 'praga' | 'doenca' | 'deficiencia' | 'daninha' | 'sadio' | 'indeterminado';
  confidence: number;        // 0..1
  nextStep: string;
  requiresPesticide: boolean;
}
