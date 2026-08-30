import { store } from '../../data/store.js';
import { CRM_STAGES } from '../../data/schema.js';
import { esc, formatCurrency, toast } from '../helpers.js';
import { openDossie } from '../dossie.js';

export function renderCrm(container) {
  const draw = () => {
    const companies = store.getCompanies().filter((c) => !c.naoContatar || CRM_STAGES.indexOf(c.statusCrm) === CRM_STAGES.length - 1);

    container.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div>
            <h2>Pipeline comercial</h2>
            <p>Arraste os cartões entre as etapas para atualizar o status de cada lead.</p>
          </div>
          <span class="badge b-neutral">${companies.length} leads ativos</span>
        </div>
        <div class="kanban">
          ${CRM_STAGES.map((stage) => columnHtml(stage, companies.filter((c) => (c.statusCrm || 'Novo Lead') === stage))).join('')}
        </div>
      </div>`;

    wireDrag();
  };

  function columnHtml(stage, items) {
    return `
      <div class="kanban-col" data-stage="${esc(stage)}">
        <div class="kanban-col-head">
          <strong>${esc(stage)}</strong>
          <span class="kanban-count">${items.length}</span>
        </div>
        <div class="kanban-cards" data-dropzone="${esc(stage)}">
          ${items.map((c) => `
            <div class="kanban-card" draggable="true" data-card="${c.id}">
              <strong>${esc(c.razaoSocial)}</strong>
              <div class="confidence-tag">${esc(c.municipio || '—')} / ${esc(c.uf || '—')}</div>
              <div class="meta">
                <span>Score ${c.score}</span>
                <span>${c.passivoValor ? formatCurrency(c.passivoValor) : 'Passivo não informado'}</span>
              </div>
              ${c.proximaAcao ? `<div class="meta" style="margin-top:6px;color:var(--text)">→ ${esc(c.proximaAcao)}</div>` : ''}
            </div>`).join('')}
        </div>
      </div>`;
  }

  function wireDrag() {
    let draggedId = null;
    container.querySelectorAll('[data-card]').forEach((card) => {
      card.addEventListener('dragstart', () => { draggedId = card.dataset.card; card.classList.add('dragging'); });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('click', () => openDossie(card.dataset.card));
    });
    container.querySelectorAll('.kanban-col').forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drop-target'); });
      col.addEventListener('dragleave', () => col.classList.remove('drop-target'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drop-target');
        if (!draggedId) return;
        const stage = col.dataset.stage;
        const company = store.getCompany(draggedId);
        store.updateCrm(draggedId, { statusCrm: stage, historicoCrm: [{ at: new Date().toISOString(), detail: `Movido para "${stage}" no pipeline` }, ...(company?.historicoCrm || [])] });
        toast(`${company?.razaoSocial || 'Lead'} movido para "${stage}".`);
        draggedId = null;
      });
    });
  }

  const unsubscribe = store.subscribe(draw);
  draw();
  return unsubscribe;
}
