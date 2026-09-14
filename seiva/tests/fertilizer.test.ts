import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFertilizer, classifyPhosphorus, classifyPotassium, limingNeed,
} from '../src/services/agronomy/fertilizer.js';

test('P: o mesmo teor classifica melhor em solo argiloso', () => {
  // Nivel critico de P cai conforme a argila sobe (5a Aproximacao):
  // 9 mg/dm3 e muito baixo em solo arenoso e alto em solo muito argiloso.
  assert.equal(classifyPhosphorus(9, 10), 'muito_baixo');
  assert.equal(classifyPhosphorus(9, 25), 'baixo');
  assert.equal(classifyPhosphorus(9, 45), 'medio');
  assert.equal(classifyPhosphorus(9, 70), 'alto');
});

test('K classifica pelas faixas da 5a aproximacao', () => {
  assert.equal(classifyPotassium(20), 'muito_baixo');
  assert.equal(classifyPotassium(40), 'baixo');
  assert.equal(classifyPotassium(70), 'medio');
  assert.equal(classifyPotassium(100), 'alto');
  assert.equal(classifyPotassium(150), 'muito_alto');
});

test('calagem pelo metodo da saturacao por bases', () => {
  // NC = (60 - 40) x 8 / 100 = 1.6 t/ha, corrigido por PRNT 85 => 1.88
  const r = limingNeed({ ctc: 8, baseSaturation: 40 }, 60, 85);
  assert.equal(r.needed, true);
  assert.equal(r.tHa, 1.9);
});

test('calagem nao recomendada quando V ja esta no alvo', () => {
  const r = limingNeed({ ctc: 8, baseSaturation: 65 }, 60, 85);
  assert.equal(r.needed, false);
  assert.equal(r.tHa, 0);
});

test('calagem sem CTC/V no laudo nao chuta valor', () => {
  const r = limingNeed({ ph: 5.2 } as never, 60, 85);
  assert.equal(r.needed, false);
  assert.equal(r.note, 'sem_dados_calagem');
});

test('soja nao recebe adubo nitrogenado (fixacao biologica)', () => {
  const res = calculateFertilizer({ crop: 'soja', areaHa: 30, targetYield: 60 });
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.data.nutrients.n, 0);
  assert.ok(res.data.notes.includes('n_fixacao_biologica'));
  assert.ok(!res.data.products.some((p) => p.name.includes('Ureia')));
});

test('milho recebe N proporcional a meta de produtividade', () => {
  const baixa = calculateFertilizer({ crop: 'milho', areaHa: 10, targetYield: 100 });
  const alta = calculateFertilizer({ crop: 'milho', areaHa: 10, targetYield: 200 });
  assert.ok(baixa.ok && alta.ok);
  if (!baixa.ok || !alta.ok) return;
  assert.ok(alta.data.nutrients.n > baixa.data.nutrients.n);
});

test('materia organica desconta N mineral', () => {
  const sem = calculateFertilizer({ crop: 'milho', areaHa: 10, targetYield: 120, soil: { pMehlich: 12, k: 70 } });
  const com = calculateFertilizer({ crop: 'milho', areaHa: 10, targetYield: 120, soil: { pMehlich: 12, k: 70, om: 3 } });
  assert.ok(sem.ok && com.ok);
  if (!sem.ok || !com.ok) return;
  // 3% de MO => 60 kg N/ha a menos.
  assert.equal(sem.data.nutrients.n - com.data.nutrients.n, 60);
});

test('solo pobre em K recebe mais K2O que solo rico', () => {
  const pobre = calculateFertilizer({ crop: 'milho', areaHa: 10, targetYield: 120, soil: { k: 20 } });
  const rico = calculateFertilizer({ crop: 'milho', areaHa: 10, targetYield: 120, soil: { k: 150 } });
  assert.ok(pobre.ok && rico.ok);
  if (!pobre.ok || !rico.ok) return;
  assert.ok(pobre.data.nutrients.k2o > rico.data.nutrients.k2o * 2);
});

test('sem laudo o plano marca que e estimativa regional', () => {
  const res = calculateFertilizer({ crop: 'milho', areaHa: 50, targetYield: 120 });
  assert.ok(res.ok);
  if (!res.ok) return;
  assert.equal(res.data.basis, 'regional_estimate');
  assert.ok(res.data.notes.includes('sem_laudo_estimativa_regional'));
});

test('total em kg escala com a area do talhao', () => {
  const res = calculateFertilizer({ crop: 'milho', areaHa: 25, targetYield: 120 });
  assert.ok(res.ok);
  if (!res.ok) return;
  for (const p of res.data.products) {
    assert.equal(p.totalKg, Math.round(p.kgPerHa * 25));
  }
});

test('area invalida e rejeitada em vez de gerar plano', () => {
  const res = calculateFertilizer({ crop: 'milho', areaHa: 0 });
  assert.equal(res.ok, false);
  if (res.ok) return;
  assert.equal(res.reason, 'invalid_input');
});
