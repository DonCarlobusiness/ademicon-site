import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bboxOf, circleFromArea } from '../src/services/satellite/geo.js';

test('circulo do pin fecha o anel (GeoJSON valido)', () => {
  const poly = circleFromArea({ lat: -12.5, lon: -55.7 }, 30);
  const ring = poly.coordinates[0]!;
  assert.deepEqual(ring[0], ring[ring.length - 1]);
  assert.ok(ring.length >= 33);
});

test('area do circulo bate com os hectares informados', () => {
  const areaHa = 50;
  const center = { lat: -12.5, lon: -55.7 };
  const ring = circleFromArea(center, areaHa).coordinates[0]!;

  // Area do poligono esferico aproximada em metros, via projecao local.
  const mPerDegLat = 111_320;
  const mPerDegLon = 111_320 * Math.cos((center.lat * Math.PI) / 180);
  let acc = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    acc += (x1 * mPerDegLon) * (y2 * mPerDegLat) - (x2 * mPerDegLon) * (y1 * mPerDegLat);
  }
  const areaM2 = Math.abs(acc / 2);
  const computedHa = areaM2 / 10_000;
  // O poligono de 32 lados inscreve o circulo, entao fica ~1% abaixo.
  assert.ok(Math.abs(computedHa - areaHa) / areaHa < 0.02, `esperado ~${areaHa} ha, veio ${computedHa.toFixed(1)}`);
});

test('talhao maior gera circulo maior', () => {
  const small = bboxOf(circleFromArea({ lat: -12, lon: -55 }, 10));
  const big = bboxOf(circleFromArea({ lat: -12, lon: -55 }, 200));
  assert.ok(big[2] - big[0] > small[2] - small[0]);
});

test('bbox envolve o centro do talhao', () => {
  const [minLon, minLat, maxLon, maxLat] = bboxOf(circleFromArea({ lat: -12.5, lon: -55.7 }, 30));
  assert.ok(minLon < -55.7 && -55.7 < maxLon);
  assert.ok(minLat < -12.5 && -12.5 < maxLat);
});
