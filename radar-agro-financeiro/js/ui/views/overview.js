import { store } from '../../data/store.js';
import { esc, formatCurrency, formatCurrencyCompact, formatDate, scoreBadgeHtml, skeletonRowsHtml } from '../helpers.js';
import { scoreTier } from '../../services/scoring.js';
import { formatCnpj } from '../../data/schema.js';
import { openDossie } from '../dossie.js';

export function renderOverview(container) {
  container.innerHTML = `<div class="kpi-grid">${Array.from({ length: 6 }).map(() => `<div class="kpi-card"><div class="skeleton" style="height:11px;width:60%"></div><div class="skeleton" style="height:26px;width:40%;margin:10px 0"></div><div class="skeleton" style="height:10px;width:70%"></div></div>`).join('')}</div>`;

  const draw = () => {
    const companies = store.getCompanies();
    const total = companies.length;
    const priority = companies.filter((c) => c.score >= 75);
    const rj = companies.filter((c) => String(c.signal).includes('Recuperação'));
    const passivoInformado = companies.filter((c) => c.passivoValor);
    const somaPassivo = passivoInformado.reduce((s, c) => s + Number(c.passivoValor || 0), 0);
    const comContato = companies.filter((c) => c.telefone || c.email);
    const recentes = companies.filter((c) => diasDesde(c.updatedAt) <= 7);
    const top = [...companies].sort((a, b) => b.score - a.score).slice(0, 6);
    const lastUpdate = store.getLastUpdate();

    const kpis = [
      { label: 'Empresas monitoradas', value: total, delta: `Base pesquisada + importações locais`, up: false },
      { label: 'Oportunidades prioritárias', value: priority.length, delta: `${pct(priority.length, total)}% da base com score ≥ 75`, up: true },
      { label: 'Recuperações judiciais', value: rj.length, delta: `${pct(rj.length, total)}% dos registros monitorados`, up: false },
      { label: 'Passivo público identificado', value: somaPassivo ? formatCurrencyCompact(somaPassivo) : `${passivoInformado.length} casos`, title: somaPassivo ? formatCurrency(somaPassivo) : '', delta: `${passivoInformado.length} empresa(s) com valor divulgado em fonte pública`, up: false },
      { label: 'Empresas com contato', value: comContato.length, delta: `${pct(comContato.length, total)}% com telefone ou e-mail cadastral`, up: true },
      { label: 'Novas nos últimos 7 dias', value: recentes.length, delta: recentes.length ? `+${recentes.length} desde a última coleta` : 'Nenhuma novidade nesta janela', up: recentes.length > 0 },
    ];

    container.innerHTML = `
      <div class="kpi-grid">
        ${kpis.map((k) => `
          <div class="kpi-card">
            <div class="kpi-label">${esc(k.label)}</div>
            <div class="kpi-value tabular" ${k.title ? `title="${esc(k.title)}"` : ''}>${typeof k.value === 'number' ? k.value.toLocaleString('pt-BR') : k.value}</div>
            <div class="kpi-delta ${k.up ? 'up' : ''}">${esc(k.delta)}</div>
          </div>`).join('')}
      </div>

      <div class="panel" style="margin-top:20px">
        <div class="panel-head">
          <div>
            <h2>Oportunidades de maior prioridade</h2>
            <p>Top 6 registros por score no momento — combine sinal público, atividade agro e disponibilidade de contato.</p>
          </div>
          <a class="btn btn-ghost" href="#/radar">Ver radar completo</a>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Score</th><th>Empresa</th><th>Município/UF</th><th>Sinal</th><th>Status CRM</th><th></th></tr></thead>
            <tbody>
              ${top.map((c) => {
                const tier = scoreTier(c.score);
                return `<tr>
                  <td data-label="Score">${scoreBadgeHtml(c.score, tier)}</td>
                  <td data-label="Empresa" class="company-cell-td"><div class="company-cell"><strong title="${esc(c.razaoSocial)}">${esc(c.razaoSocial)}</strong><small>${esc(formatCnpj(c.cnpj))}</small></div></td>
                  <td data-label="Local">${esc(c.municipio || '—')} / ${esc(c.uf || '—')}</td>
                  <td data-label="Sinal"><span class="badge b-neutral">${esc(c.signal)}</span></td>
                  <td data-label="CRM">${esc(c.statusCrm || 'Novo Lead')}</td>
                  <td data-label=""><button class="rowbtn" data-dossie="${c.id}">Ver dossiê</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section-grid" style="margin-top:20px">
        <div class="info-card">
          <b>Cobertura da base</b>
          <p>${new Set(companies.map((c) => c.uf).filter(Boolean)).size} estados monitorados · ${new Set(companies.map((c) => c.segmento).filter(Boolean)).size} segmentos distintos.</p>
        </div>
        <div class="info-card">
          <b>Última atualização das fontes</b>
          <p>${lastUpdate ? formatDate(lastUpdate) : 'Nenhuma atualização manual registrada nesta sessão'} — atualizado conforme disponibilidade da fonte.</p>
        </div>
        <div class="info-card">
          <b>Uso responsável</b>
          <p>Sinais de recuperação judicial ou passivo público não equivalem, por si só, a dívida rural confirmada. Valide sempre a fonte antes de qualquer abordagem comercial.</p>
        </div>
      </div>`;

    container.querySelectorAll('[data-dossie]').forEach((btn) => btn.addEventListener('click', () => openDossie(btn.dataset.dossie)));
  };

  const unsubscribe = store.subscribe(draw);
  setTimeout(draw, 260);
  return unsubscribe;
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
function diasDesde(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / 86400000;
}
