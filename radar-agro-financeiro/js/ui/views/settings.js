import { store } from '../../data/store.js';
import { esc, toast } from '../helpers.js';

export function renderSettings(container) {
  function draw() {
    const companies = store.getCompanies();
    const naoContatar = companies.filter((c) => c.naoContatar);
    const settings = store.settings;

    container.innerHTML = `
      <div class="section-grid" style="grid-template-columns:2fr 1fr">
        <div class="panel">
          <div class="panel-head"><div><h2>LGPD & tratamento de dados</h2><p>Controles de finalidade, origem e opt-out do radar.</p></div></div>
          <div class="panel-body">
            <div class="detail-item wide" style="margin-bottom:16px">
              <span>Finalidade do tratamento</span>
              <textarea class="field" id="purposeInput" style="width:100%;margin-top:6px;min-height:64px;resize:vertical">${esc(settings.purposeOfProcessing)}</textarea>
            </div>
            <div class="settings-row">
              <div><strong>Priorizar canais empresariais públicos</strong><span>O radar nunca busca telefone pessoal oculto — apenas contatos cadastrais/corporativos públicos.</span></div>
              <div class="switch on"></div>
            </div>
            <div class="settings-row">
              <div><strong>Atualização automática de fontes</strong><span>Quando habilitada, o radar tenta atualizar fontes periodicamente (sujeito à disponibilidade de cada origem).</span></div>
              <button class="switch ${settings.autoUpdate ? 'on' : ''}" id="autoUpdateToggle" aria-label="Alternar atualização automática"></button>
            </div>
            <div class="settings-row">
              <div><strong>Controle de acesso</strong><span>Autenticação por usuário está prevista na arquitetura (ver README) — hoje esta instância roda em modo single-user local.</span></div>
              <span class="badge b-neutral">Em preparação</span>
            </div>
            <div class="divider"></div>
            <button class="btn" id="savePurpose">Salvar finalidade</button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><div><h2>Opt-out / Não contatar</h2><p>${naoContatar.length} empresa(s) marcada(s)</p></div></div>
          <div class="panel-body" style="max-height:340px;overflow:auto">
            ${naoContatar.length ? naoContatar.map((c) => `<div class="settings-row"><div><strong>${esc(c.razaoSocial)}</strong><span>${esc(c.municipio || '—')} / ${esc(c.uf || '—')}</span></div></div>`).join('') : '<p style="font-size:12px;color:var(--text-muted)">Nenhuma empresa marcada como "Não contatar" até o momento.</p>'}
          </div>
        </div>
      </div>

      <div class="panel" style="margin-top:20px">
        <div class="panel-head"><div><h2>Dados locais desta sessão</h2><p>Este ambiente estático guarda dados no navegador (localStorage) até a migração para banco de dados dedicado.</p></div></div>
        <div class="panel-body">
          <div class="settings-row">
            <div><strong>Registros importados localmente</strong><span>Inclui overrides de CRM e planilhas importadas neste navegador.</span></div>
            <button class="btn btn-danger btn-sm" id="resetData">Apagar dados importados</button>
          </div>
        </div>
      </div>`;

    container.querySelector('#autoUpdateToggle').addEventListener('click', () => {
      store.saveSettings({ autoUpdate: !settings.autoUpdate });
      toast(`Atualização automática ${!settings.autoUpdate ? 'ativada' : 'desativada'}.`);
    });
    container.querySelector('#savePurpose').addEventListener('click', () => {
      store.saveSettings({ purposeOfProcessing: container.querySelector('#purposeInput').value });
      store.logAudit({ action: 'settings_update', target: 'purposeOfProcessing', detail: 'Finalidade de tratamento atualizada.' });
      toast('Finalidade de tratamento salva.');
    });
    container.querySelector('#resetData').addEventListener('click', () => {
      if (!confirm('Isso apaga permanentemente os dados importados e os ajustes de CRM salvos neste navegador. Continuar?')) return;
      store.resetImportedData();
      toast('Dados importados apagados.');
    });
  }

  const unsubscribe = store.subscribe(draw);
  draw();
  return unsubscribe;
}
