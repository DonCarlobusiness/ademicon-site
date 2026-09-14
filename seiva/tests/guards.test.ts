import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPesticideWarning, mentionsPesticide, looksLikeFabricatedIndex } from '../src/agent/guards.js';
import { ptBR } from '../src/i18n/pt-BR.js';

test('detecta recomendacao de defensivo por categoria', () => {
  assert.equal(mentionsPesticide('Precisa passar um fungicida na lavoura'), true);
  assert.equal(mentionsPesticide('Vale fazer a pulverizacao'), true);
  assert.equal(mentionsPesticide('Aduba com ureia em cobertura'), false);
});

test('detecta ingrediente ativo citado sem a palavra agrotoxico', () => {
  // O modelo costuma citar o nome tecnico direto; o aviso tem que disparar igual.
  assert.equal(mentionsPesticide('Um produto a base de azoxistrobina resolve'), true);
  assert.equal(mentionsPesticide('Aplique glifosato na entrelinha'), true);
});

test('aviso legal e anexado quando ha defensivo', () => {
  const out = applyPesticideWarning('Passe um inseticida nessa area.', 'pt-BR');
  assert.ok(out.includes(ptBR.pesticideWarning));
  assert.ok(out.includes('Lei 7.802/89'));
});

test('aviso nao aparece em resposta sem defensivo', () => {
  const text = 'Seu talhao esta com vigor bom. Siga o plano de adubacao.';
  assert.equal(applyPesticideWarning(text, 'pt-BR'), text);
});

test('aviso nao duplica se ja foi anexado', () => {
  const once = applyPesticideWarning('Use fungicida.', 'pt-BR');
  const twice = applyPesticideWarning(once, 'pt-BR');
  assert.equal(once, twice);
});

test('aviso nao duplica quando o modelo ja escreveu com outras palavras', () => {
  const text = 'Use fungicida. Lembre que o receituario agronomico e obrigatorio.';
  assert.equal(applyPesticideWarning(text, 'pt-BR'), text);
});

test('aviso sai no idioma do produtor', () => {
  const es = applyPesticideWarning('Aplicar un fungicida.', 'es-419');
  assert.ok(es.includes('receta agronomica'));
  const en = applyPesticideWarning('Apply a fungicide.', 'en');
  assert.ok(en.includes('agronomic prescription'));
});

test('flagra indice de satelite citado sem dado real', () => {
  // Ferramenta NAO rodou: citar um NDVI numerico e alucinacao.
  assert.equal(looksLikeFabricatedIndex('O NDVI do seu talhao esta em 0,72.', false), true);
  assert.equal(looksLikeFabricatedIndex('O NDVI do seu talhao esta em 0,72.', true), false);
});

test('nao flagra resposta que diz nao ter imagem', () => {
  const honest = 'Nao tive passagem de satelite sem nuvem essa semana, entao nao tenho NDVI para te passar.';
  assert.equal(looksLikeFabricatedIndex(honest, false), false);
});
