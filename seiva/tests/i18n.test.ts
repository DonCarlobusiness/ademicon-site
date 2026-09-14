import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, detectLocale } from '../src/i18n/index.js';
import { ptBR } from '../src/i18n/pt-BR.js';
import { es419 } from '../src/i18n/es-419.js';
import { en } from '../src/i18n/en.js';

const LOCALES = { 'pt-BR': ptBR, 'es-419': es419, en } as const;

test('os tres idiomas tem exatamente as mesmas chaves', () => {
  const base = Object.keys(ptBR).sort();
  for (const [name, dict] of Object.entries(LOCALES)) {
    assert.deepEqual(Object.keys(dict).sort(), base, `dicionario ${name} divergente`);
  }
});

test('nenhuma traducao ficou vazia', () => {
  for (const [name, dict] of Object.entries(LOCALES)) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(value.trim().length > 0, `${name}.${key} vazio`);
    }
  }
});

test('placeholders sao os mesmos em todos os idiomas', () => {
  // Um {name} que some na traducao vira mensagem quebrada para o produtor.
  const vars = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(',');
  for (const key of Object.keys(ptBR) as (keyof typeof ptBR)[]) {
    const expected = vars(ptBR[key]);
    for (const [name, dict] of Object.entries(LOCALES)) {
      assert.equal(vars(dict[key]), expected, `placeholders divergentes em ${name}.${key}`);
    }
  }
});

test('interpolacao substitui as variaveis', () => {
  const out = t('pt-BR', 'onboardingDone', {
    name: 'Joao', area: 30, crop: 'soja', municipality: 'Sorriso',
  });
  assert.ok(out.includes('Joao') && out.includes('30') && out.includes('Sorriso'));
  assert.ok(!out.includes('{name}'));
});

test('variavel ausente nao quebra a mensagem', () => {
  const out = t('pt-BR', 'noClearPass', {});
  assert.ok(out.length > 0);
});

test('detecta idioma do produtor', () => {
  assert.equal(detectLocale('vai chover amanha?'), 'pt-BR');
  assert.equal(detectLocale('hola, va a llover manana?'), 'es-419');
  assert.equal(detectLocale('hi, will it rain tomorrow?'), 'en');
  assert.equal(detectLocale(null), 'pt-BR');
});
