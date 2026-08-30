import { store } from './data/store.js';
import { ICONS, esc, toast, formatDate } from './ui/helpers.js';
import { closeDossie } from './ui/dossie.js';
import { renderOverview } from './ui/views/overview.js';
import { renderRadar } from './ui/views/radar.js';
import { renderCompanies } from './ui/views/companies.js';
import { renderRecuperacaoJudicial } from './ui/views/recuperacaoJudicial.js';
import { renderPassivosPublicos } from './ui/views/passivosPublicos.js';
import { renderCreditoRural } from './ui/views/creditoRural.js';
import { renderImportar } from './ui/views/importar.js';
import { renderCrm } from './ui/views/crm.js';
import { renderFontes } from './ui/views/fontes.js';
import { renderSettings } from './ui/views/settings.js';

const ROUTES = [
  { id: 'visao-geral', label: 'Visão Geral', icon: 'overview', title: 'Visão Geral', subtitle: 'Panorama consolidado das oportunidades monitoradas pelo radar.', render: renderOverview },
  { id: 'radar', label: 'Radar de Oportunidades', icon: 'radar', title: 'Radar de Oportunidades', subtitle: 'Empresas reais, sinais públicos de reestruturação e dados cadastrais rastreáveis por fonte.', render: renderRadar },
  { id: 'empresas', label: 'Empresas', icon: 'companies', title: 'Empresas', subtitle: 'Base completa de empresas monitoradas, pesquisadas ou importadas.', render: renderCompanies },
  { id: 'recuperacao-judicial', label: 'Recuperação Judicial', icon: 'rj', title: 'Recuperação Judicial', subtitle: 'Processos de recuperação judicial deferidos ou em tramitação.', render: renderRecuperacaoJudicial },
  { id: 'passivos-publicos', label: 'Passivos Públicos', icon: 'liabilities', title: 'Passivos Públicos', subtitle: 'Sinais públicos de passivo — nunca inferidos automaticamente como dívida rural confirmada.', render: renderPassivosPublicos },
  { id: 'credito-rural', label: 'Inteligência de Crédito Rural', icon: 'rural', title: 'Inteligência de Crédito Rural', subtitle: 'Leitura agregada por município e cultura — nunca exposição individual do produtor.', render: renderCreditoRural },
  { id: 'importar', label: 'Importar Base', icon: 'import', title: 'Importar Base', subtitle: 'Traga sua planilha para cruzar com a base pesquisada, sem perder dados já existentes.', render: renderImportar },
  { id: 'crm', label: 'CRM', icon: 'crm', title: 'Pipeline Comercial', subtitle: 'Organize a prospecção das oportunidades identificadas pelo radar.', render: renderCrm },
  { id: 'fontes', label: 'Fontes e Auditoria', icon: 'sources', title: 'Fontes e Auditoria', subtitle: 'Origem, confiança e trilha de auditoria de cada dado do radar.', render: renderFontes },
  { id: 'configuracoes', label: 'Configurações', icon: 'settings', title: 'Configurações', subtitle: 'LGPD, opt-out, finalidade de tratamento e dados locais.', render: renderSettings },
];

const appShell = document.getElementById('appShell');
const viewContainer = document.getElementById('viewContainer');
const mainNav = document.getElementById('mainNav');
let currentCleanup = null;

function buildNav() {
  mainNav.innerHTML = ROUTES.map((r) => `
    <button class="nav-item" data-route="${r.id}">
      <span class="icon">${ICONS[r.icon]}</span>
      <span class="label">${esc(r.label)}</span>
    </button>`).join('');
  mainNav.querySelectorAll('[data-route]').forEach((btn) => btn.addEventListener('click', () => { location.hash = `#/${btn.dataset.route}`; }));
}

function router() {
  const hash = location.hash.replace('#/', '') || 'visao-geral';
  const route = ROUTES.find((r) => r.id === hash) || ROUTES[0];

  mainNav.querySelectorAll('[data-route]').forEach((btn) => btn.classList.toggle('active', btn.dataset.route === route.id));
  document.getElementById('viewTitle').textContent = route.title;
  document.getElementById('viewSubtitle').textContent = route.subtitle;

  if (typeof currentCleanup === 'function') currentCleanup();
  closeDossie();
  viewContainer.scrollTop = 0;
  currentCleanup = route.render(viewContainer) || null;
}

function wireSidebarCollapse() {
  const collapsed = localStorage.getItem('terraOeste.sidebarCollapsed') === '1';
  appShell.classList.toggle('collapsed', collapsed);
  document.getElementById('sidebarCollapse').addEventListener('click', () => {
    const next = !appShell.classList.contains('collapsed');
    appShell.classList.toggle('collapsed', next);
    localStorage.setItem('terraOeste.sidebarCollapsed', next ? '1' : '0');
  });
}

function wireTopbar() {
  const searchInput = document.getElementById('globalSearch');
  searchInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !searchInput.value.trim()) return;
    sessionStorage.setItem('globalSearchQuery', searchInput.value.trim());
    location.hash = '#/radar';
    searchInput.blur();
  });

  document.getElementById('btnImportTop').addEventListener('click', () => { location.hash = '#/importar'; });

  document.getElementById('btnRefresh').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = 'Atualizando…';
    await new Promise((r) => setTimeout(r, 700));
    store.touchLastUpdate();
    store.logAudit({ action: 'manual_refresh', target: 'todas as fontes', detail: 'Atualização manual disparada pelo usuário.' });
    btn.disabled = false;
    btn.innerHTML = original;
    toast('Dados atualizados conforme disponibilidade das fontes.');
  });
}

function updateStatusAndLastUpdate() {
  const last = store.getLastUpdate();
  document.getElementById('lastUpdateValue').textContent = last ? formatDate(last) : 'Ainda não atualizado';
  document.getElementById('statusText').textContent = last ? 'Operacional' : 'Aguardando primeira atualização';
  document.getElementById('statusDot').classList.toggle('warn', !last);
}

function init() {
  buildNav();
  wireSidebarCollapse();
  wireTopbar();
  updateStatusAndLastUpdate();
  store.subscribe(updateStatusAndLastUpdate);

  window.addEventListener('hashchange', router);
  router();
}

init();
