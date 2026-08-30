import { store } from '../data/store.js';
import { formatCnpj, isConfirmedRuralDebt, CRM_STAGES } from '../data/schema.js';
import { scoreTier } from '../services/scoring.js';
import { esc, formatDate, formatCurrency, toast, scoreBadgeHtml, ruralDebtBadgeHtml } from './helpers.js';

const backdrop = document.getElementById('drawerBackdrop');
const drawer = document.getElementById('dossieDrawer');
let activeTab = 'overview';
let currentId = null;

backdrop.addEventListener('click', closeDossie);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDossie(); });

export function openDossie(id) {
  currentId = id;
  activeTab = 'overview';
  render();
  backdrop.classList.add('open');
  drawer.classList.add('open');
}

export function closeDossie() {
  backdrop.classList.remove('open');
  drawer.classList.remove('open');
}

function render() {
  const c = store.getCompany(currentId);
  if (!c) { drawer.innerHTML = ''; return; }
  const tier = scoreTier(c.score);
  const confirmed = isConfirmedRuralDebt(c);

  drawer.innerHTML = `
    <div class="drawer-head">
      <div class="drawer-head-top">
        <div>
          <p class="eyebrow">Dossiê empresarial</p>
          <h3 style="font-size:19px;margin-top:4px">${esc(c.razaoSocial)}</h3>
          ${c.nomeFantasia && c.nomeFantasia !== c.razaoSocial ? `<p class="sub" style="margin-top:2px">${esc(c.nomeFantasia)}</p>` : ''}
          <p class="drawer-cnpj" style="margin-top:6px">${esc(formatCnpj(c.cnpj))}</p>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          ${scoreBadgeHtml(c.score, tier)}
          <button class="drawer-close" id="dossieClose">×</button>
        </div>
      </div>
      <div class="drawer-badges" style="padding-bottom:16px">
        <span class="badge ${c.statusCadastral === 'ATIVA' ? 'b-success' : 'b-neutral'}">${esc(c.statusCadastral || '—')}</span>
        <span class="badge b-neutral">${esc(c.statusCrm || 'Novo Lead')}</span>
        ${ruralDebtBadgeHtml(confirmed)}
      </div>
      <div class="tabset">
        ${tabs().map((t) => `<button class="tab-btn ${activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">${esc(t.label)}</button>`).join('')}
      </div>
    </div>
    <div class="drawer-scroll">
      <div class="tab-panel active">${tabContent(c, confirmed)}</div>
    </div>`;

  drawer.querySelector('#dossieClose').addEventListener('click', closeDossie);
  drawer.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => { activeTab = btn.dataset.tab; render(); }));
  wireCrmForm(c);
}

function tabs() {
  return [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'signals', label: 'Sinais Financeiros' },
    { id: 'contacts', label: 'Contatos' },
    { id: 'sources', label: 'Fontes' },
    { id: 'crm', label: 'CRM' },
  ];
}

function tabContent(c, confirmed) {
  if (activeTab === 'overview') return overviewTab(c);
  if (activeTab === 'signals') return signalsTab(c, confirmed);
  if (activeTab === 'contacts') return contactsTab(c);
  if (activeTab === 'sources') return sourcesTab(c);
  if (activeTab === 'crm') return crmTab(c);
  return '';
}

function item(label, value, wide = false) {
  return `<div class="detail-item ${wide ? 'wide' : ''}"><span>${esc(label)}</span><b>${esc(value ?? '—') || '—'}</b></div>`;
}

function overviewTab(c) {
  return `<div class="detail-grid">
    ${item('Atividade principal', c.cnaeDescricao || c.segmento)}
    ${item('CNAE', c.cnaePrincipal)}
    ${item('Município', c.municipio)}
    ${item('UF', c.uf)}
    ${item('Porte', c.porte)}
    ${item('Capital social', c.capitalSocial ? formatCurrency(c.capitalSocial) : 'Não informado na fonte')}
    ${item('Data de abertura', c.dataAbertura ? formatDate(c.dataAbertura) : 'Não informado')}
    ${item('Responsável', c.responsavel)}
    ${item('Quadro societário', c.quadroSocietario?.length ? c.quadroSocietario.join(', ') : 'Não público na fonte consultada', true)}
    ${c.notasCrm ? item('Observação da pesquisa', c.notasCrm, true) : ''}
  </div>`;
}

function signalsTab(c, confirmed) {
  return `
    <div class="notice ${confirmed ? '' : 'warn'}">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5l6 11.5H1.5l6-11.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M7.5 6v3M7.5 10.8v.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
      ${confirmed
        ? '<b>Dívida rural confirmada.</b> Este registro possui lastro documental específico registrado na auditoria.'
        : '<b>Sinal público, ainda não confirmado.</b> Este é um sinal de endividamento/reestruturação encontrado em fonte pública. Não trate como dívida rural bancária confirmada sem documentação ou autorização de diagnóstico.'}
    </div>
    <div class="detail-grid">
      ${item('Sinal público', c.signal)}
      ${item('Situação cadastral', c.statusCadastral)}
      ${item('Passivo conhecido', c.passivoDescricao)}
      ${item('Valor do passivo', c.passivoValor ? formatCurrency(c.passivoValor) : 'Não divulgado na fonte')}
      ${item('Data do evento', c.source?.publishedAt ? formatDate(c.source.publishedAt) : 'Não informado')}
      ${item('Fonte do sinal', c.source?.name)}
      ${c.processos?.length ? item('Processos vinculados', c.processos.map((p) => p.numero).join(', '), true) : ''}
    </div>`;
}

function contactsTab(c) {
  return `<div class="detail-grid">
    ${item('Telefone empresarial', c.telefone || 'Não carregado')}
    ${item('WhatsApp empresarial', c.whatsapp || 'Não carregado')}
    ${item('E-mail empresarial', c.email || 'Não carregado')}
    ${item('Site', c.site || 'Não informado')}
    ${item('Canais corporativos', 'Priorize sempre canais empresariais públicos. Este sistema não busca telefone pessoal oculto.', true)}
  </div>`;
}

function sourcesTab(c) {
  const s = c.source || {};
  return `<div class="detail-grid">
    ${item('Nome da fonte', s.name)}
    ${item('Nível de confiança', s.confidence ? s.confidence.toUpperCase() : '—')}
    ${item('Coletado em', s.collectedAt ? formatDate(s.collectedAt) : '—')}
    ${item('Data da informação original', s.publishedAt ? formatDate(s.publishedAt) : 'Não informado pela fonte')}
    ${item('Tipo de dado', s.dataType)}
    ${item('Origem no radar', c.origem === 'pesquisado' ? 'Pesquisa cadastral/judicial' : 'Importação de planilha do usuário')}
    <div class="detail-item wide">
      <span>Auditoria</span>
      ${s.url
        ? `<a class="source-link" target="_blank" rel="noopener" href="${esc(s.url)}">Abrir fonte pública original ↗</a>`
        : '<b>Sem URL registrada — origem cadastrada manualmente.</b>'}
    </div>
  </div>`;
}

function crmTab(c) {
  return `
    <div class="detail-grid">
      <div class="detail-item">
        <span>Etapa atual</span>
        <select class="field" style="width:100%;margin-top:4px" id="crmStage">
          ${CRM_STAGES.map((s) => `<option value="${esc(s)}" ${c.statusCrm === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
        </select>
      </div>
      <div class="detail-item">
        <span>Responsável pelo lead</span>
        <input class="field" style="width:100%;margin-top:4px" id="crmResponsavel" value="${esc(c.crmResponsavel || '')}" placeholder="Nome do responsável">
      </div>
      <div class="detail-item">
        <span>Última interação</span>
        <input class="field" type="date" style="width:100%;margin-top:4px" id="crmUltima" value="${esc(c.ultimaInteracao || '')}">
      </div>
      <div class="detail-item">
        <span>Próxima ação</span>
        <input class="field" style="width:100%;margin-top:4px" id="crmProxima" value="${esc(c.proximaAcao || '')}" placeholder="Ex.: Ligar para validar contato">
      </div>
      <div class="detail-item wide">
        <span>Notas</span>
        <textarea class="field" style="width:100%;margin-top:4px;min-height:70px;resize:vertical" id="crmNotas" placeholder="Registre o histórico de contato...">${esc(c.notasCrm || '')}</textarea>
      </div>
    </div>
    <div class="divider"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)">
        <input type="checkbox" class="checkbox" id="crmNaoContatar" ${c.naoContatar ? 'checked' : ''}> Marcar como "Não contatar" (LGPD)
      </label>
      <button class="btn btn-primary btn-sm" id="crmSave">Salvar alterações</button>
    </div>
    ${c.historicoCrm?.length ? `
    <div class="divider"></div>
    <p style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Histórico</p>
    <ul style="display:flex;flex-direction:column;gap:6px">
      ${c.historicoCrm.slice(0, 6).map((h) => `<li style="font-size:11.5px;color:var(--text-muted)">${esc(formatDate(h.at))} — ${esc(h.detail)}</li>`).join('')}
    </ul>` : ''}`;
}

function wireCrmForm(c) {
  const btn = drawer.querySelector('#crmSave');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const patch = {
      statusCrm: drawer.querySelector('#crmStage').value,
      crmResponsavel: drawer.querySelector('#crmResponsavel').value,
      ultimaInteracao: drawer.querySelector('#crmUltima').value,
      proximaAcao: drawer.querySelector('#crmProxima').value,
      notasCrm: drawer.querySelector('#crmNotas').value,
      naoContatar: drawer.querySelector('#crmNaoContatar').checked,
    };
    store.updateCrm(c.cnpj, { ...patch, historicoCrm: [{ at: new Date().toISOString(), detail: `Etapa CRM atualizada para "${patch.statusCrm}"` }, ...(c.historicoCrm || [])] });
    toast('Dados de CRM atualizados.');
    render();
  });
}
