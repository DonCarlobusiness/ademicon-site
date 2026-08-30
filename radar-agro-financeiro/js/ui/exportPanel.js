import { exportCSV, exportXLSX } from '../services/exporter.js';
import { toast } from './helpers.js';

/**
 * Painel de exportação — cobre os três escopos pedidos (selecionados,
 * filtrados, lista completa) cruzados com os dois formatos (CSV/Excel).
 */
export function openExportPanel({ selectedCount, filteredCount, totalCount, getSelected, getFiltered, getAll }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop open';
  backdrop.innerHTML = `
    <div class="modal" style="width:min(420px,96vw)">
      <div class="modal-head">
        <h3 style="font-size:15px">Exportar dados</h3>
        <button class="drawer-close" id="epClose">×</button>
      </div>
      <div class="modal-body">
        <div class="detail-item" style="margin-bottom:12px">
          <span>Escopo</span>
          <select class="field" id="epScope" style="width:100%;margin-top:6px">
            <option value="selected" ${!selectedCount ? 'disabled' : ''}>Somente selecionadas (${selectedCount})</option>
            <option value="filtered" selected>Empresas filtradas (${filteredCount})</option>
            <option value="all">Lista completa (${totalCount})</option>
          </select>
        </div>
        <div class="detail-item">
          <span>Formato</span>
          <select class="field" id="epFormat" style="width:100%;margin-top:6px">
            <option value="csv">CSV</option>
            <option value="xlsx">Excel (.xlsx)</option>
          </select>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="epCancel">Cancelar</button>
        <button class="btn btn-primary" id="epConfirm">Exportar</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('#epClose').addEventListener('click', close);
  backdrop.querySelector('#epCancel').addEventListener('click', close);
  backdrop.querySelector('#epConfirm').addEventListener('click', () => {
    const scope = backdrop.querySelector('#epScope').value;
    const format = backdrop.querySelector('#epFormat').value;
    const rows = scope === 'selected' ? getSelected() : scope === 'filtered' ? getFiltered() : getAll();
    if (!rows.length) { toast('Nenhuma empresa nesse escopo para exportar.', 'error'); return; }
    try {
      if (format === 'csv') exportCSV(rows, `radar_agro_financeiro_${scope}.csv`);
      else exportXLSX(rows, `Radar_Agro_Financeiro_${scope}.xlsx`);
      toast(`${rows.length} empresa(s) exportada(s) em ${format.toUpperCase()}.`);
      close();
    } catch (e) {
      toast(e.message || 'Não foi possível exportar agora.', 'error');
    }
  });
}
