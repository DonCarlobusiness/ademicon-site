import { esc } from '../helpers.js';

const SAMPLE_COLUMNS = ['Município', 'Cultura', 'Finalidade', 'Volume Contratado (agregado)', 'Tendência 12m'];

export function renderCreditoRural(container) {
  container.innerHTML = `
    <div class="notice warn" style="margin:0 0 20px">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5l6 11.5H1.5l6-11.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M7.5 6v3M7.5 10.8v.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
      <span><b>Dados agregados. Não representam exposição financeira individual do produtor.</b> Esta tela nunca exibirá dívida bancária individualizada sem autorização explícita do titular para diagnóstico.</span>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div>
          <h2>Inteligência de Crédito Rural</h2>
          <p>Leitura agregada de volume de crédito rural contratado por município, cultura e finalidade.</p>
        </div>
        <span class="badge b-neutral">Agregado · Não individual</span>
      </div>

      <div class="panel-body">
        <div class="empty-state" style="padding:40px 20px">
          <div class="empty-icon">
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none"><path d="M2 15h14M4 15V8l5-4 5 4v7" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 15v-4h2v4" stroke="currentColor" stroke-width="1.4"/></svg>
          </div>
          <h3>Integração de fontes agregadas ainda não conectada</h3>
          <p>Esta tela está preparada para consumir dados agregados do Banco Central (SICOR/MDCR) por município, cultura e finalidade do crédito rural, assim que a integração for habilitada.</p>
          <div class="empty-actions">
            <button class="btn btn-primary" data-action="go-settings">Configurar fontes em Configurações</button>
          </div>
        </div>

        <div class="divider"></div>

        <p style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Estrutura prevista da tabela agregada</p>
        <div class="table-scroll">
          <table style="min-width:760px">
            <thead><tr>${SAMPLE_COLUMNS.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
            <tbody>
              <tr>${SAMPLE_COLUMNS.map(() => `<td style="color:var(--text-faint)">Aguardando integração</td>`).join('')}</tr>
            </tbody>
          </table>
        </div>

        <div class="section-grid" style="margin-top:20px">
          <div class="info-card">
            <b>Fonte prevista</b>
            <p>Banco Central do Brasil — SICOR / Matriz de Dados do Crédito Rural (MDCR), consolidada por município e finalidade.</p>
          </div>
          <div class="info-card">
            <b>Frequência</b>
            <p>Atualizado conforme disponibilidade da fonte — normalmente trimestral. Nunca tratado como dado em tempo real.</p>
          </div>
          <div class="info-card">
            <b>Uso permitido</b>
            <p>Leitura de tendência regional para priorização de prospecção. Nunca para inferir exposição individual de um produtor específico.</p>
          </div>
        </div>
      </div>
    </div>`;

  container.querySelectorAll('[data-action="go-settings"]').forEach((btn) => btn.addEventListener('click', () => { location.hash = '#/configuracoes'; }));
}
