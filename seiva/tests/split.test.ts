import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitForWhatsApp, WHATSAPP_TEXT_LIMIT } from '../src/channels/whatsapp/client.js';

test('texto curto nao e dividido', () => {
  assert.deepEqual(splitForWhatsApp('resposta curta'), ['resposta curta']);
});

test('texto longo respeita o limite da Meta', () => {
  const long = 'palavra '.repeat(1200);
  for (const part of splitForWhatsApp(long)) {
    assert.ok(part.length <= WHATSAPP_TEXT_LIMIT, `parte com ${part.length} caracteres`);
  }
});

test('nao corta no meio da palavra', () => {
  const long = `${'a'.repeat(30)} `.repeat(300);
  for (const part of splitForWhatsApp(long, 200)) {
    assert.ok(!/\S$/.test(part) || part.endsWith('a'), 'corte no meio de palavra');
    assert.ok(part.split(' ').every((w) => w.length <= 30));
  }
});

test('prefere quebrar em paragrafo', () => {
  const text = `${'x'.repeat(150)}\n\n${'y'.repeat(150)}`;
  const parts = splitForWhatsApp(text, 200);
  assert.equal(parts[0], 'x'.repeat(150));
});

test('nenhum conteudo se perde na divisao', () => {
  const long = Array.from({ length: 500 }, (_, i) => `linha ${i}`).join('\n');
  const joined = splitForWhatsApp(long, 300).join('\n');
  assert.equal(joined.replace(/\s+/g, ' '), long.replace(/\s+/g, ' '));
});
