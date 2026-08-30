import { store } from '../../data/store.js';
import { parseFile, autoDetectMapping, processImport, IMPORT_FIELDS } from '../../services/importer.js';
import { esc, toast } from '../helpers.js';

export function renderImportar(container) {
  const state = { step: 1, file: null, headers: [], rows: [], mapping: {}, result: null, error: null };

  draw();

  function draw() {
    container.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div>
            <h2>Importar e cruzar base</h2>
            <p>Aceita .csv, .xls e .xlsx. O sistema reconhece automaticamente CNPJ, razão social, telefone, e-mail, cidade, UF e CNAE.</p>
          </div>
        </div>
        <div class="step-track">
          ${['1. Upload', '2. Mapeamento', '3. Revisão', '4. Relatório'].map((label, i) => {
            const n = i + 1;
            return `<div class="step-pill ${state.step === n ? 'active' : ''} ${state.step > n ? 'done' : ''}">${esc(label)}</div>`;
          }).join('')}
        </div>
        <div class="panel-body" id="importStepBody"></div>
      </div>
      <div class="section-grid" style="margin-top:20px">
        <div class="info-card"><b>1. Identificação</b><p>Use colunas como CNPJ, Razão Social, Empresa ou Nome Fantasia.</p></div>
        <div class="info-card"><b>2. Contatos</b><p>Telefone, WhatsApp e e-mail são preservados exatamente como vierem da sua base.</p></div>
        <div class="info-card"><b>3. Cruzamento</b><p>Quando o CNPJ já existir no radar, os dados importados complementam o registro sem apagar campos melhores já existentes.</p></div>
      </div>
      ${historyHtml()}`;

    drawStep();
  }

  function drawStep() {
    const body = container.querySelector('#importStepBody');
    if (state.step === 1) body.innerHTML = stepUpload();
    if (state.step === 2) body.innerHTML = stepMapping();
    if (state.step === 3) body.innerHTML = stepReview();
    if (state.step === 4) body.innerHTML = stepReport();
    wireStep();
  }

  function stepUpload() {
    return `
      <div class="dropzone" id="dropzone">
        <div class="drop-icon">
          <svg width="22" height="22" viewBox="0 0 18 18" fill="none"><path d="M9 2v9m0 0l-3.2-3.2M9 11l3.2-3.2M3 13.5V15a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 15 15v-1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h3>Arraste sua planilha aqui</h3>
        <p>ou selecione um arquivo .csv, .xls ou .xlsx do seu computador</p>
        <input id="importInput" type="file" accept=".csv,.xls,.xlsx">
      </div>
      ${state.error ? `<div class="notice danger" style="margin-top:16px"><b>${esc(state.error)}</b></div>` : ''}`;
  }

  function stepMapping() {
    return `
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px">${state.rows.length} linha(s) detectada(s) em <b style="color:var(--text)">${esc(state.file.name)}</b>. Ajuste o mapeamento de colunas se necessário.</p>
      ${IMPORT_FIELDS.map((f) => `
        <div class="map-row">
          <span style="font-size:12.5px;font-weight:600">${esc(f.label)} ${f.required ? '<span style="color:var(--danger)">*</span>' : ''}</span>
          <span style="color:var(--text-faint)">→</span>
          <select class="field" data-map="${f.key}">
            <option value="">Não importar</option>
            ${state.headers.map((h) => `<option value="${esc(h)}" ${state.mapping[f.key] === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}
          </select>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;margin-top:18px">
        <button class="btn" id="mapBack">Voltar</button>
        <button class="btn btn-primary" id="mapNext">Avançar para revisão</button>
      </div>`;
  }

  function stepReview() {
    const preview = state.rows.slice(0, 8);
    const headers = Object.keys(preview[0] || {});
    return `
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Pré-visualização das primeiras ${preview.length} linhas com o mapeamento atual. Confira antes de confirmar a importação.</p>
      <div class="table-scroll">
        <table style="min-width:640px">
          <thead><tr>${IMPORT_FIELDS.filter((f) => state.mapping[f.key]).map((f) => `<th>${esc(f.label)}</th>`).join('')}</tr></thead>
          <tbody>
            ${preview.map((row) => `<tr>${IMPORT_FIELDS.filter((f) => state.mapping[f.key]).map((f) => `<td>${esc(row[state.mapping[f.key]] ?? '')}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:18px">
        <button class="btn" id="reviewBack">Voltar ao mapeamento</button>
        <button class="btn btn-primary" id="reviewConfirm">Confirmar importação</button>
      </div>`;
  }

  function stepReport() {
    const r = state.result.report;
    return `
      <div class="report-grid">
        <div class="report-card ok"><div class="num tabular">${r.imported}</div><div class="lbl">Importadas</div></div>
        <div class="report-card"><div class="num tabular">${r.updated}</div><div class="lbl">Atualizadas</div></div>
        <div class="report-card warn"><div class="num tabular">${r.duplicated}</div><div class="lbl">Duplicadas no arquivo</div></div>
        <div class="report-card err"><div class="num tabular">${r.errors}</div><div class="lbl">Com erro</div></div>
      </div>
      ${r.errorDetails?.length ? `
      <div class="notice danger" style="margin-top:16px">
        <b>Linhas com erro:</b>
        <ul style="margin-top:8px;padding-left:16px;list-style:disc">
          ${r.errorDetails.slice(0, 10).map((e) => `<li>Linha ${e.line}: ${esc(e.reason)} (${esc(e.raw || '—')})</li>`).join('')}
        </ul>
      </div>` : ''}
      <div style="display:flex;gap:10px;margin-top:18px">
        <button class="btn btn-primary" id="reportGoRadar">Ver no Radar de Oportunidades</button>
        <button class="btn" id="reportNewImport">Importar outra planilha</button>
      </div>`;
  }

  function historyHtml() {
    const history = store.getImportHistory();
    if (!history.length) return '';
    return `
      <div class="panel" style="margin-top:20px">
        <div class="panel-head"><div><h2>Histórico de importações</h2><p>Últimas execuções registradas nesta base local.</p></div></div>
        <div class="table-scroll">
          <table style="min-width:640px">
            <thead><tr><th>Data</th><th>Arquivo</th><th>Importadas</th><th>Atualizadas</th><th>Duplicadas</th><th>Erros</th></tr></thead>
            <tbody>
              ${history.map((h) => `<tr>
                <td data-label="Data">${new Date(h.at).toLocaleString('pt-BR')}</td>
                <td data-label="Arquivo">${esc(h.fileName)}</td>
                <td data-label="Importadas">${h.report.imported}</td>
                <td data-label="Atualizadas">${h.report.updated}</td>
                <td data-label="Duplicadas">${h.report.duplicated}</td>
                <td data-label="Erros">${h.report.errors}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function wireStep() {
    const $ = (s) => container.querySelector(s);
    const dz = $('#dropzone');
    if (dz) {
      $('#importInput').addEventListener('change', (e) => handleFile(e.target.files[0]));
      ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
      ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
      dz.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
    }
    $('#mapBack')?.addEventListener('click', () => { state.step = 1; drawStep(); });
    $('#mapNext')?.addEventListener('click', () => {
      container.querySelectorAll('[data-map]').forEach((sel) => { state.mapping[sel.dataset.map] = sel.value; });
      if (!state.mapping.cnpj || !state.mapping.razaoSocial) {
        toast('Mapeie ao menos CNPJ e Razão Social/Empresa para continuar.', 'error');
        return;
      }
      state.step = 3;
      drawStep();
    });
    $('#reviewBack')?.addEventListener('click', () => { state.step = 2; drawStep(); });
    $('#reviewConfirm')?.addEventListener('click', () => {
      const { toMerge, report } = processImport(state.rows, state.mapping, store.getCompanies());
      store.mergeImportedCompanies(toMerge);
      store.recordImport({ fileName: state.file.name, report });
      store.logAudit({ action: 'import', target: state.file.name, detail: `${report.imported} importadas, ${report.updated} atualizadas, ${report.errors} com erro` });
      store.touchLastUpdate();
      state.result = { report };
      state.step = 4;
      draw();
      toast(`Importação concluída: ${report.imported} novas, ${report.updated} atualizadas.`);
    });
    $('#reportGoRadar')?.addEventListener('click', () => { location.hash = '#/radar'; });
    $('#reportNewImport')?.addEventListener('click', () => {
      Object.assign(state, { step: 1, file: null, headers: [], rows: [], mapping: {}, result: null, error: null });
      draw();
    });
  }

  async function handleFile(file) {
    if (!file) return;
    try {
      state.error = null;
      const { headers, rows } = await parseFile(file);
      if (!rows.length) throw new Error('Não foi possível ler linhas nesta planilha. Verifique o arquivo e tente novamente.');
      state.file = file;
      state.headers = headers;
      state.rows = rows;
      state.mapping = autoDetectMapping(headers);
      state.step = 2;
      draw();
    } catch (e) {
      state.error = e.message || 'Erro ao ler o arquivo.';
      drawStep();
    }
  }
}
