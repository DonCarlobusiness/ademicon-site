import { esc } from './helpers.js';

/** Painel de filtros avançados (modal). `rows` alimenta os selects com valores existentes na base atual. */
export function openFiltersPanel(rows, currentFilters, onApply) {
  const ufs = [...new Set(rows.map((r) => r.uf).filter(Boolean))].sort();
  const municipios = [...new Set(rows.map((r) => r.municipio).filter(Boolean))].sort();
  const cnaes = [...new Set(rows.map((r) => r.cnaePrincipal).filter(Boolean))].sort();
  const segmentos = [...new Set(rows.map((r) => r.segmento).filter(Boolean))].sort();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop open';
  backdrop.innerHTML = `
    <div class="modal" style="width:min(600px,96vw)">
      <div class="modal-head">
        <h3 style="font-size:15px">Filtros avançados</h3>
        <button class="drawer-close" id="fpClose">×</button>
      </div>
      <div class="modal-body" style="max-height:64vh;overflow:auto">
        <div class="detail-grid">
          ${select('uf', 'Estado', ufs, currentFilters.uf)}
          ${select('municipio', 'Município', municipios, currentFilters.municipio)}
          ${select('cnae', 'CNAE', cnaes, currentFilters.cnae)}
          ${select('segmento', 'Segmento', segmentos, currentFilters.segmento)}
          ${select('rj', 'Recuperação judicial', [['yes', 'Somente com RJ'], ['no', 'Somente sem RJ']], currentFilters.rj)}
          ${select('status', 'Situação cadastral', [['ativa', 'Somente ativas'], ['inativa', 'Somente inativas']], currentFilters.status)}
          ${select('hasPhone', 'Empresa com telefone', [['yes', 'Sim']], currentFilters.hasPhone)}
          ${select('hasEmail', 'Empresa com e-mail', [['yes', 'Sim']], currentFilters.hasEmail)}
          ${select('origem', 'Origem da informação', [['pesquisado', 'Base pesquisada'], ['importado', 'Base importada']], currentFilters.origem)}
          ${select('passivoFaixa', 'Passivo conhecido', [['informado', 'Com valor informado'], ['nao-informado', 'Sem valor informado']], currentFilters.passivoFaixa)}
          <div class="detail-item">
            <span>Score mínimo</span>
            <input class="field" style="width:100%;margin-top:2px" id="fp_scoreMin" type="number" min="0" max="100" value="${currentFilters.scoreMin || ''}" placeholder="0–100">
          </div>
          <div class="detail-item">
            <span>Atualizado desde</span>
            <input class="field" style="width:100%;margin-top:2px" id="fp_updatedSince" type="date" value="${currentFilters.updatedSince || ''}">
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="link-btn" id="fpReset">Limpar filtros</button>
        <div style="flex:1"></div>
        <button class="btn" id="fpCancel">Cancelar</button>
        <button class="btn btn-primary" id="fpApply">Aplicar filtros</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  function select(id, label, options, current) {
    const opts = options.map((o) => Array.isArray(o) ? o : [o, o]);
    return `<div class="detail-item">
      <span>${esc(label)}</span>
      <select class="field" style="width:100%;margin-top:2px" id="fp_${id}">
        <option value="">Todos</option>
        ${opts.map(([v, l]) => `<option value="${esc(v)}" ${current === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}
      </select>
    </div>`;
  }

  function close() { backdrop.remove(); }
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('#fpClose').addEventListener('click', close);
  backdrop.querySelector('#fpCancel').addEventListener('click', close);
  backdrop.querySelector('#fpReset').addEventListener('click', () => { onApply({}); close(); });
  backdrop.querySelector('#fpApply').addEventListener('click', () => {
    const ids = ['uf', 'municipio', 'cnae', 'segmento', 'rj', 'status', 'hasPhone', 'hasEmail', 'origem', 'passivoFaixa', 'scoreMin', 'updatedSince'];
    const next = {};
    ids.forEach((id) => {
      const el = backdrop.querySelector(`#fp_${id}`);
      if (el && el.value) next[id] = el.value;
    });
    onApply(next);
    close();
  });

  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
}
