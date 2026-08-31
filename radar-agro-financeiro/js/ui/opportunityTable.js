import { store } from '../data/store.js';
import { formatCnpj, isConfirmedRuralDebt, normCnpj } from '../data/schema.js';
import { scoreTier } from '../services/scoring.js';
import { esc, formatDate, debounce, scoreBadgeHtml, signalBadgeHtml, emptyStateHtml, skeletonRowsHtml, waLink } from './helpers.js';
import { openDossie } from './dossie.js';
import { openFiltersPanel } from './filtersPanel.js';
import { openExportPanel } from './exportPanel.js';

const PAGE_SIZE = 8;

/**
 * Tabela de oportunidades — reutilizada em Radar, Empresas, Recuperação
 * Judicial e Passivos Públicos. Cada tela passa apenas um `presetFilter`
 * e textos de cabeçalho; toda a lógica de busca/ordenação/paginação/
 * seleção/exportação vive aqui uma única vez.
 */
export function mountOpportunityTable(container, opts) {
  const {
    title = 'Oportunidades identificadas',
    description = 'Não classificamos automaticamente o passivo como “dívida rural” sem documentação ou evidência específica.',
    presetFilter = () => true,
    columns = DEFAULT_COLUMNS,
    emptyIcon = '◈',
  } = opts;

  const pendingQuery = sessionStorage.getItem('globalSearchQuery');
  if (pendingQuery) sessionStorage.removeItem('globalSearchQuery');

  const state = {
    query: pendingQuery || '',
    sortKey: 'score',
    sortDir: 'desc',
    page: 1,
    selected: new Set(),
    filters: {}, // preenchido pelo painel de filtros avançados
    loading: true,
  };

  container.innerHTML = skeletonShell(title, description);
  setTimeout(() => {
    state.loading = false;
    render();
  }, 320);

  const unsubscribe = store.subscribe(() => render());

  function getSourceRows() {
    return store.getCompanies().filter(presetFilter);
  }

  function applyFilters(rows) {
    const q = state.query.trim().toLowerCase();
    const f = state.filters;
    return rows.filter((c) => {
      if (q) {
        const hay = [c.razaoSocial, c.cnpj, normCnpj(c.cnpj), c.municipio, c.uf, c.cnaePrincipal, c.segmento].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (f.uf && c.uf !== f.uf) return false;
      if (f.municipio && c.municipio !== f.municipio) return false;
      if (f.cnae && c.cnaePrincipal !== f.cnae) return false;
      if (f.segmento && c.segmento !== f.segmento) return false;
      if (f.rj === 'yes' && !String(c.signal).includes('Recuperação')) return false;
      if (f.rj === 'no' && String(c.signal).includes('Recuperação')) return false;
      if (f.status === 'ativa' && c.statusCadastral !== 'ATIVA') return false;
      if (f.status === 'inativa' && c.statusCadastral === 'ATIVA') return false;
      if (f.hasPhone === 'yes' && !c.telefone) return false;
      if (f.hasEmail === 'yes' && !c.email) return false;
      if (f.scoreMin && c.score < Number(f.scoreMin)) return false;
      if (f.origem && c.origem !== f.origem) return false;
      if (f.passivoFaixa === 'informado' && !c.passivoValor) return false;
      if (f.passivoFaixa === 'nao-informado' && c.passivoValor) return false;
      if (f.updatedSince && new Date(c.updatedAt) < new Date(f.updatedSince)) return false;
      return true;
    });
  }

  function applySort(rows) {
    const { sortKey, sortDir } = state;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === 'company') { av = a.razaoSocial; bv = b.razaoSocial; }
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av === undefined || av === null) av = '';
      if (bv === undefined || bv === null) bv = '';
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  function activeFilterChips() {
    const f = state.filters;
    const chips = [];
    if (f.uf) chips.push(['uf', `UF: ${f.uf}`]);
    if (f.municipio) chips.push(['municipio', `Cidade: ${f.municipio}`]);
    if (f.cnae) chips.push(['cnae', `CNAE: ${f.cnae}`]);
    if (f.segmento) chips.push(['segmento', `Segmento: ${f.segmento}`]);
    if (f.rj) chips.push(['rj', f.rj === 'yes' ? 'Somente RJ' : 'Sem RJ']);
    if (f.status) chips.push(['status', f.status === 'ativa' ? 'Somente ativas' : 'Somente inativas']);
    if (f.hasPhone === 'yes') chips.push(['hasPhone', 'Com telefone']);
    if (f.hasEmail === 'yes') chips.push(['hasEmail', 'Com e-mail']);
    if (f.scoreMin) chips.push(['scoreMin', `Score ≥ ${f.scoreMin}`]);
    if (f.origem) chips.push(['origem', f.origem === 'pesquisado' ? 'Base pesquisada' : 'Base importada']);
    if (f.passivoFaixa) chips.push(['passivoFaixa', f.passivoFaixa === 'informado' ? 'Com passivo informado' : 'Sem passivo informado']);
    if (f.updatedSince) chips.push(['updatedSince', `Desde ${formatDate(f.updatedSince)}`]);
    return chips;
  }

  function render() {
    if (state.loading) return;
    const all = getSourceRows();
    const filtered = applySort(applyFilters(all));
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const pageRows = filtered.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    const chips = activeFilterChips();

    container.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div>
            <h2>${esc(title)}</h2>
            <p>${esc(description)}</p>
          </div>
          <span class="badge b-success"><span class="badge-dot"></span>BASE REAL</span>
        </div>

        <div class="filter-bar">
          <input class="field field-search" id="tblSearch" placeholder="Empresa, CNPJ, cidade ou CNAE…" value="${esc(state.query)}">
          <button class="btn" id="tblAdvFilters">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 3h11M3.5 7h7M5.7 11h2.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            Filtros avançados
          </button>
          ${chips.length ? `<button class="link-btn" id="tblClearFilters">Limpar filtros</button>` : ''}
          <div style="flex:1"></div>
          <span style="font-size:11px;color:var(--text-muted)">${filtered.length} de ${all.length} empresas</span>
          <button class="btn btn-gold" id="tblExport">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11V2m0 9l-3-3m3 3l3-3M2 12.5h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Exportar
          </button>
        </div>
        ${chips.length ? `<div class="filter-chip-row">${chips.map(([k, label]) => `<span class="filter-chip">${esc(label)}<button data-chip="${k}">✕</button></span>`).join('')}</div>` : ''}

        ${state.selected.size ? `
        <div class="bulk-bar">
          <span>${state.selected.size} selecionada(s)</span>
          <button class="btn btn-sm" id="tblClearSelection">Limpar seleção</button>
        </div>` : ''}

        ${filtered.length === 0 ? emptyStateHtml({
          icon: emptyIcon,
          title: 'Nenhuma empresa encontrada para esses filtros.',
          description: 'Ajuste os filtros aplicados ou importe uma nova base para ampliar a cobertura do radar.',
          actions: [
            { label: 'Limpar filtros', action: 'clear-filters' },
            { label: 'Importar base', action: 'go-import', primary: true },
          ],
        }) : `
        <div class="table-scroll">
          <table>
            <thead><tr>
              <th style="width:34px"><input type="checkbox" class="checkbox" id="tblSelectAll" ${pageRows.length && pageRows.every((r) => state.selected.has(r.id)) ? 'checked' : ''}></th>
              ${columns.map((c) => `<th class="${c.sortKey ? 'sortable' : ''} ${state.sortKey === c.sortKey ? 'active' : ''}" data-sort="${c.sortKey || ''}">${esc(c.label)} ${c.sortKey ? `<span class="sort-ind">${state.sortKey === c.sortKey ? (state.sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>` : ''}</th>`).join('')}
              <th></th>
            </tr></thead>
            <tbody>${pageRows.map((c) => rowHtml(c, columns, state.selected.has(c.id))).join('')}</tbody>
          </table>
        </div>
        <div class="table-footbar">
          <span style="font-size:11px;color:var(--text-muted)">Página ${state.page} de ${totalPages}</span>
          <div class="pagination">
            <button class="page-btn" id="tblPrev" ${state.page <= 1 ? 'disabled' : ''}>‹</button>
            ${pageButtons(state.page, totalPages).map((p) => p === '…' ? `<span style="padding:0 4px;color:var(--text-faint)">…</span>` : `<button class="page-btn ${p === state.page ? 'active' : ''}" data-page="${p}">${p}</button>`).join('')}
            <button class="page-btn" id="tblNext" ${state.page >= totalPages ? 'disabled' : ''}>›</button>
          </div>
        </div>`}
      </div>`;

    wireEvents(all);
  }

  function rowHtml(c, columns, selected) {
    const tier = scoreTier(c.score);
    return `<tr class="${selected ? 'selected' : ''}" data-row="${c.id}">
      <td data-label=""><input type="checkbox" class="checkbox" data-select="${c.id}" ${selected ? 'checked' : ''}></td>
      ${columns.map((col) => `<td data-label="${esc(col.label)}" class="${col.key === 'company' ? 'company-cell-td' : ''}">${col.render(c, tier)}</td>`).join('')}
      <td data-label=""><div class="row-actions">${waLink(c.whatsapp || c.telefone) ? `<a class="rowbtn" title="Abrir no WhatsApp" target="_blank" rel="noopener" href="${esc(waLink(c.whatsapp || c.telefone))}">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 12l.9-3.3A5 5 0 1 1 7 12.7L2 12z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
      </a>` : ''}<button class="rowbtn" data-dossie="${c.id}">Ver dossiê</button></div></td>
    </tr>`;
  }

  function wireEvents(all) {
    const $ = (sel) => container.querySelector(sel);
    $('#tblSearch')?.addEventListener('input', debounce((e) => { state.query = e.target.value; state.page = 1; render(); }, 280));
    $('#tblAdvFilters')?.addEventListener('click', () => openFiltersPanel(all, state.filters, (next) => { state.filters = next; state.page = 1; render(); }));
    $('#tblClearFilters')?.addEventListener('click', () => { state.filters = {}; state.page = 1; render(); });
    container.querySelector('#viewContainer'); // no-op guard
    container.querySelectorAll('[data-chip]').forEach((btn) => btn.addEventListener('click', () => {
      const key = btn.dataset.chip;
      const next = { ...state.filters };
      delete next[key];
      state.filters = next;
      render();
    }));
    $('#tblSelectAll')?.addEventListener('change', (e) => {
      const rows = applySort(applyFilters(all)).slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
      rows.forEach((r) => (e.target.checked ? state.selected.add(r.id) : state.selected.delete(r.id)));
      render();
    });
    container.querySelectorAll('[data-select]').forEach((cb) => cb.addEventListener('change', (e) => {
      const id = cb.dataset.select;
      e.target.checked ? state.selected.add(id) : state.selected.delete(id);
      render();
    }));
    $('#tblExport')?.addEventListener('click', () => {
      const filteredRows = applySort(applyFilters(all));
      openExportPanel({
        selectedCount: state.selected.size,
        filteredCount: filteredRows.length,
        totalCount: all.length,
        getSelected: () => all.filter((c) => state.selected.has(c.id)),
        getFiltered: () => filteredRows,
        getAll: () => all,
      });
    });
    $('#tblClearSelection')?.addEventListener('click', () => { state.selected.clear(); render(); });
    container.querySelectorAll('th.sortable').forEach((th) => th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else { state.sortKey = key; state.sortDir = 'desc'; }
      render();
    }));
    $('#tblPrev')?.addEventListener('click', () => { state.page -= 1; render(); });
    $('#tblNext')?.addEventListener('click', () => { state.page += 1; render(); });
    container.querySelectorAll('[data-page]').forEach((btn) => btn.addEventListener('click', () => { state.page = Number(btn.dataset.page); render(); }));
    container.querySelectorAll('[data-dossie]').forEach((btn) => btn.addEventListener('click', () => openDossie(btn.dataset.dossie)));
    container.querySelectorAll('[data-action="clear-filters"]').forEach((btn) => btn.addEventListener('click', () => { state.filters = {}; state.query = ''; render(); }));
    container.querySelectorAll('[data-action="go-import"]').forEach((btn) => btn.addEventListener('click', () => location.hash = '#/importar'));
  }

  return () => unsubscribe();
}

function pageButtons(current, total) {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

function skeletonShell(title, description) {
  return `<div class="panel">
    <div class="panel-head"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div></div>
    <div class="filter-bar">${Array.from({ length: 4 }).map(() => '<div class="skeleton" style="height:34px;width:140px;border-radius:9px"></div>').join('')}</div>
    ${skeletonRowsHtml(6)}
  </div>`;
}

export const DEFAULT_COLUMNS = [
  { key: 'score', label: 'Score', sortKey: 'score', render: (c, tier) => scoreBadgeHtml(c.score, tier) },
  { key: 'company', label: 'Empresa', sortKey: 'company', render: (c) => `<div class="company-cell"><strong title="${esc(c.razaoSocial)}">${esc(c.razaoSocial)}</strong><small>${esc(formatCnpj(c.cnpj))}</small></div>` },
  { key: 'local', label: 'Município/UF', render: (c) => `${esc(c.municipio || '—')} / ${esc(c.uf || '—')}` },
  { key: 'segmento', label: 'Segmento', render: (c) => esc(c.segmento || '—') },
  { key: 'cnae', label: 'CNAE', render: (c) => `<span class="tabular" style="font-family:var(--font-mono);font-size:11px">${esc(c.cnaePrincipal || '—')}</span>` },
  { key: 'signal', label: 'Sinal identificado', render: (c) => signalBadgeHtml(c.signal) },
  { key: 'passivo', label: 'Passivo conhecido', render: (c) => `<span title="${isConfirmedRuralDebt(c) ? 'Dívida rural confirmada' : 'Sinal público — não confirmado'}">${esc(c.passivoDescricao || '—')}</span>` },
  { key: 'responsavel', label: 'Responsável', render: (c) => esc(c.responsavel || '—') },
  { key: 'telefone', label: 'Telefone', render: (c) => c.telefone ? `<span class="tabular">${esc(c.telefone)}</span>` : '<span style="color:var(--text-faint)">—</span>' },
  { key: 'email', label: 'E-mail', render: (c) => c.email ? esc(c.email) : '<span style="color:var(--text-faint)">—</span>' },
  { key: 'fonte', label: 'Fonte', render: (c) => c.source?.url ? `<a class="source-link" target="_blank" rel="noopener" href="${esc(c.source.url)}">${esc(c.source.name)} ↗</a>` : esc(c.source?.name || 'Importado') },
  { key: 'atualizacao', label: 'Atualização', sortKey: 'updatedAt', render: (c) => formatDate(c.updatedAt) },
  { key: 'crm', label: 'Status CRM', render: (c) => `<span class="badge b-neutral">${esc(c.statusCrm || 'Novo Lead')}</span>` },
];
