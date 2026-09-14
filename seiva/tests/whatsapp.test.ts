import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMetaWebhook } from '../src/channels/whatsapp/inbound.js';
import { parseArea, parseCrop } from '../src/channels/whatsapp/onboarding.js';

function wrap(message: unknown, contacts?: unknown) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ value: { contacts, messages: [message] } }] }],
  };
}

test('extrai mensagem de texto', () => {
  const [m] = parseMetaWebhook(wrap({
    id: 'wamid.1', from: '5566999998888', timestamp: '1767225600',
    type: 'text', text: { body: 'vai chover?' },
  }, [{ wa_id: '5566999998888', profile: { name: 'Joao' } }]));

  assert.equal(m!.kind, 'text');
  assert.equal(m!.text, 'vai chover?');
  assert.equal(m!.waId, '5566999998888');
  assert.equal(m!.profileName, 'Joao');
});

test('extrai localizacao do pin', () => {
  const [m] = parseMetaWebhook(wrap({
    id: 'wamid.2', from: '556699', timestamp: '1767225600',
    type: 'location', location: { latitude: -12.55, longitude: -55.71 },
  }));
  assert.equal(m!.kind, 'location');
  assert.deepEqual(m!.location, { lat: -12.55, lon: -55.71 });
});

test('audio vira kind audio com mediaId', () => {
  const [m] = parseMetaWebhook(wrap({
    id: 'wamid.3', from: '556699', timestamp: '1767225600',
    type: 'audio', audio: { id: 'media-1', mime_type: 'audio/ogg' },
  }));
  assert.equal(m!.kind, 'audio');
  assert.equal(m!.mediaId, 'media-1');
});

test('foto com legenda preserva a pergunta do produtor', () => {
  const [m] = parseMetaWebhook(wrap({
    id: 'wamid.4', from: '556699', timestamp: '1767225600',
    type: 'image', image: { id: 'media-2', mime_type: 'image/jpeg', caption: 'que praga e essa?' },
  }));
  assert.equal(m!.kind, 'image');
  assert.equal(m!.text, 'que praga e essa?');
});

test('recibo de entrega nao vira mensagem', () => {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.1', status: 'delivered' }] } }] }],
  };
  assert.equal(parseMetaWebhook(payload).length, 0);
});

test('payload malformado nao derruba o webhook', () => {
  assert.deepEqual(parseMetaWebhook({ garbage: true }), []);
  assert.deepEqual(parseMetaWebhook(null), []);
  assert.deepEqual(parseMetaWebhook('nao e json'), []);
});

test('reconhece a cultura em linguagem de produtor', () => {
  assert.equal(parseCrop('plantei soja'), 'soja');
  assert.equal(parseCrop('é milho safrinha'), 'milho');
  assert.equal(parseCrop('tenho café'), 'cafe');
  assert.equal(parseCrop('pasto pra gado'), 'pastagem');
  assert.equal(parseCrop('maiz'), 'milho');
  assert.equal(parseCrop('sei la'), null);
});

test('entende a area escrita de varios jeitos', () => {
  assert.equal(parseArea('30'), 30);
  assert.equal(parseArea('30 ha'), 30);
  assert.equal(parseArea('uns 30,5 hectares'), 30.5);
  assert.equal(parseArea('30.5'), 30.5);
  assert.equal(parseArea('nao sei'), null);
});

test('area absurda e rejeitada em vez de virar talhao', () => {
  assert.equal(parseArea('999999999'), null);
  assert.equal(parseArea('0'), null);
});
