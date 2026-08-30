import { store } from '../../data/store.js';
import { esc, formatDate } from '../helpers.js';

const METHOD_STEPS = [
  ['01 · Encontrar', 'Empresas ligadas a CNAEs agrícolas, pecuários, insumos, grãos e apoio ao agronegócio.'],
  ['02 · Detectar sinal', 'Recuperação judicial, pedido de recuperação ou outro passivo público documentado.'],
  ['03 · Conferir', 'Validar CNPJ, situação cadastral, localidade, fonte, data e atividade econômica.'],
  ['04 · Priorizar', 'Score considera aderência ao agro, força do sinal, empresa ativa, contato e confiabilidade da fonte.'],
  ['05 · Abordar', 'Utilizar contato empresarial público sem afirmar detalhes bancários não comprovados.'],
  ['06 · Diagnosticar', 'Após interesse/autorização, analisar documentos para confirmar a natureza rural do passivo.'],
];

export function renderFontes(container) {
  let tab = 'fontes';

  function draw() {
    const companies = store.getCompanies();
    const sources = {};
    companies.forEach((c) => {
      const key = c.source?.name || 'Fonte não identificada';
      if (!sources[key]) sources[key] = { name: key, count: 0, confidence: c.source?.confidence, url: c.source?.url };
      sources[key].count += 1;
    });
    const auditLog = store.getAuditLog();

    container.innerHTML = `
      <div class="panel">
        <div class="tabset" style="padding-top:4px">
          <button class="tab-btn ${tab === 'fontes' ? 'active' : ''}" data-tab="fontes">Fontes & Auditoria</button>
          <button class="tab-btn ${tab === 'metodologia' ? 'active' : ''}" data-tab="metodologia">Metodologia</button>
        </div>
        <div class="panel-body">
          ${tab === 'fontes' ? fontesTab(sources, auditLog) : metodologiaTab()}
        </div>
      </div>`;

    container.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => { tab = btn.dataset.tab; draw(); }));
  }

  function fontesTab(sources, auditLog) {
    return `
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Cada dado salvo no radar carrega origem, data de coleta, data de publicação e nível de confiança. Nenhuma informação é exibida sem fonte conhecida.</p>
      <div class="section-grid">
        ${Object.values(sources).map((s) => `
          <div class="info-card">
            <b>${esc(s.name)}</b>
            <p>${s.count} registro(s) · confiança <span class="trust-tag">${esc((s.confidence || 'não informada').toUpperCase())}</span></p>
            ${s.url ? `<a class="source-link" style="margin-top:8px;display:inline-block" target="_blank" rel="noopener" href="${esc(s.url)}">Abrir referência ↗</a>` : ''}
          </div>`).join('')}
      </div>

      <div class="divider"></div>
      <p style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Trilha de auditoria (últimas ações)</p>
      ${auditLog.length ? `
      <div class="table-scroll">
        <table style="min-width:600px">
          <thead><tr><th>Quando</th><th>Ação</th><th>Alvo</th><th>Detalhe</th></tr></thead>
          <tbody>
            ${auditLog.slice(0, 25).map((a) => `<tr>
              <td data-label="Quando">${new Date(a.at).toLocaleString('pt-BR')}</td>
              <td data-label="Ação"><span class="badge b-neutral">${esc(a.action)}</span></td>
              <td data-label="Alvo">${esc(a.target)}</td>
              <td data-label="Detalhe">${esc(a.detail || '—')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<p style="font-size:12px;color:var(--text-muted)">Nenhuma ação registrada nesta sessão ainda.</p>'}`;
  }

  function metodologiaTab() {
    return `
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Como um registro público se transforma em uma oportunidade — ainda sujeita a validação — dentro do radar.</p>
      <div class="section-grid">
        ${METHOD_STEPS.map(([title, desc]) => `<div class="info-card"><b>${esc(title)}</b><p>${esc(desc)}</p></div>`).join('')}
      </div>
      <div class="notice" style="margin-top:20px">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5l6 11.5H1.5l6-11.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M7.5 6v3M7.5 10.8v.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        <span><b>Uso responsável:</b> "recuperação judicial" ou "dívida ativa" não equivale, por si só, a "dívida rural bancária". Antes de qualquer abordagem ou oferta de diagnóstico, valide a fonte, a atualidade do dado e utilize canais empresariais apropriados.</span>
      </div>`;
  }

  draw();
}
