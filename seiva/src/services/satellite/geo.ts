import type { Field, GeoJSONPolygon, LatLon } from '../../domain/types.js';

const EARTH_RADIUS_M = 6_378_137;

/**
 * Quando o produtor so mandou o pin, aproximamos o talhao por um circulo
 * com a area declarada. Nao e o contorno real — e o suficiente para a
 * estatistica de NDVI e muito melhor do que pedir para ele desenhar
 * poligono no WhatsApp.
 */
export function circleFromArea(centroid: LatLon, areaHa: number, steps = 32): GeoJSONPolygon {
  const areaM2 = areaHa * 10_000;
  const radiusM = Math.sqrt(areaM2 / Math.PI);
  const latRad = (centroid.lat * Math.PI) / 180;
  const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLon = dLat / Math.max(Math.cos(latRad), 1e-6);

  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (2 * Math.PI * i) / steps;
    ring.push([centroid.lon + dLon * Math.cos(theta), centroid.lat + dLat * Math.sin(theta)]);
  }
  // GeoJSON exige o anel fechado.
  ring[ring.length - 1] = ring[0]!;
  return { type: 'Polygon', coordinates: [ring] };
}

export function fieldPolygon(field: Field): GeoJSONPolygon {
  return field.geom ?? circleFromArea(field.centroid, field.areaHa);
}

export function bboxOf(polygon: GeoJSONPolygon): [number, number, number, number] {
  const coords = polygon.coordinates[0] ?? [];
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLon, minLat, maxLon, maxLat];
}

export function daysAgoISO(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
