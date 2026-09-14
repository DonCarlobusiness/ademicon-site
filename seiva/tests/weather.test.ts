import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSprayWindows, dryStreak } from '../src/services/weather/windows.js';
import type { WeatherDay } from '../src/domain/types.js';

function day(p: Partial<WeatherDay>): WeatherDay {
  return {
    date: '2026-01-01', tMinC: 18, tMaxC: 27, rainMm: 0, rainProb: 10,
    windKmh: 6, humidityPct: 70, et0Mm: 4, ...p,
  };
}

test('dia calmo e boa janela de aplicacao', () => {
  const [w] = computeSprayWindows([day({})]);
  assert.equal(w!.suitable, true);
  assert.deepEqual(w!.reasons, []);
});

test('vento forte reprova por deriva', () => {
  const [w] = computeSprayWindows([day({ windKmh: 18 })]);
  assert.equal(w!.suitable, false);
  assert.ok(w!.reasons.some((r) => r.includes('deriva')));
});

test('vento parado reprova por inversao termica', () => {
  const [w] = computeSprayWindows([day({ windKmh: 1 })]);
  assert.equal(w!.suitable, false);
  assert.ok(w!.reasons.some((r) => r.includes('inversao')));
});

test('chuva prevista reprova a aplicacao', () => {
  assert.equal(computeSprayWindows([day({ rainMm: 8 })])[0]!.suitable, false);
  assert.equal(computeSprayWindows([day({ rainProb: 80 })])[0]!.suitable, false);
});

test('calor e ar seco reprovam por evaporacao da gota', () => {
  const [w] = computeSprayWindows([day({ tMaxC: 34, humidityPct: 40 })]);
  assert.equal(w!.suitable, false);
  assert.equal(w!.reasons.length, 2);
});

test('conta dias seguidos sem chuva ate a primeira chuva', () => {
  const days = [day({ rainMm: 0 }), day({ rainMm: 0.4 }), day({ rainMm: 12 }), day({ rainMm: 0 })];
  assert.equal(dryStreak(days), 2);
});

test('chove hoje: sequencia seca e zero', () => {
  assert.equal(dryStreak([day({ rainMm: 20 }), day({ rainMm: 0 })]), 0);
});
