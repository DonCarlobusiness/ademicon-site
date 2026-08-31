export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

export function formatCurrency(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Gera um link wa.me a partir de um telefone BR em qualquer formatação. Assume DDI 55 quando ausente. */
export function waLink(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

export function formatCurrencyCompact(v) {
  if (!v) return 'R$ 0';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function formatDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('pt-BR');
}

export function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function toast(message, type = 'success') {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'error'
    ? '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" stroke="#ff9b9e" stroke-width="1.3"/><path d="M7.5 4.5v4M7.5 10.3v.1" stroke="#ff9b9e" stroke-width="1.3" stroke-linecap="round"/></svg>'
    : '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" stroke="#37D67A" stroke-width="1.3"/><path d="M4.5 7.7l2 2 4-4.4" stroke="#37D67A" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  el.innerHTML = `${icon}<span>${esc(message)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 220ms ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 240);
  }, 3600);
}

export function scoreBadgeHtml(score, tier) {
  return `<div class="score-pill ${tier.key}" title="${esc(tier.label)}">${score}</div>`;
}

export function signalBadgeHtml(signal) {
  const map = {
    'Recuperação Judicial': 'b-danger',
    'Pedido de Recuperação Judicial': 'b-warn',
    'Dívida Ativa da União': 'b-warn',
    'Protesto de Título': 'b-warn',
    'Processo Judicial (outro)': 'b-neutral',
    'Registro Importado': 'b-neutral',
  };
  const cls = map[signal] || 'b-neutral';
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${esc(signal || 'Sinal não classificado')}</span>`;
}

export function ruralDebtBadgeHtml(confirmed) {
  return confirmed
    ? '<span class="badge b-gold" title="Confirmado com lastro documental">Dívida rural confirmada</span>'
    : '<span class="badge b-neutral" title="Sinal público ainda sem documentação/autorização de diagnóstico">Sinal público — não confirmado</span>';
}

export function emptyStateHtml({ icon = '◈', title, description, actions = [] }) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(description)}</p>
      <div class="empty-actions">
        ${actions.map((a) => `<button class="btn ${a.primary ? 'btn-primary' : ''}" data-action="${esc(a.action)}">${esc(a.label)}</button>`).join('')}
      </div>
    </div>`;
}

export function skeletonRowsHtml(n = 6) {
  return Array.from({ length: n }).map(() => `
    <div class="skeleton-row">
      ${Array.from({ length: 6 }).map(() => `<div class="skeleton"></div>`).join('')}
    </div>`).join('');
}

export const ICONS = {
  overview: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.4" stroke="currentColor" stroke-width="1.4"/><rect x="10" y="2" width="6" height="6" rx="1.4" stroke="currentColor" stroke-width="1.4"/><rect x="2" y="10" width="6" height="6" rx="1.4" stroke="currentColor" stroke-width="1.4"/><rect x="10" y="10" width="6" height="6" rx="1.4" stroke="currentColor" stroke-width="1.4"/></svg>',
  radar: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M9 9L14 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="9" cy="9" r="1.4" fill="currentColor"/></svg>',
  companies: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 15V4.5A1.5 1.5 0 0 1 4.5 3h5A1.5 1.5 0 0 1 11 4.5V15" stroke="currentColor" stroke-width="1.4"/><path d="M11 8h2.5A1.5 1.5 0 0 1 15 9.5V15" stroke="currentColor" stroke-width="1.4"/><path d="M6 6.3h1.5M6 9h1.5M6 11.7h1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  rj: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2l6.5 3.4v3.2c0 4-2.7 6.9-6.5 8-3.8-1.1-6.5-4-6.5-8V5.4L9 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M6.5 9l1.8 1.8L11.7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  liabilities: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M4.5 5h6.7a2 2 0 1 1 0 4H6.8a2 2 0 1 0 0 4h7.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  rural: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 15h14M4 15V8l5-4 5 4v7" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 15v-4h2v4" stroke="currentColor" stroke-width="1.4"/></svg>',
  import: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v9m0 0l-3.2-3.2M9 11l3.2-3.2M3 13.5V15a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 15 15v-1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  crm: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="4" height="12" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="7" y="6" width="4" height="9" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="12" y="9" width="4" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/></svg>',
  sources: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" stroke="currentColor" stroke-width="1.4"/><path d="M9 6v3l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  settings: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.4" stroke="currentColor" stroke-width="1.4"/><path d="M9 2.5v1.6M9 13.9v1.6M15.5 9h-1.6M4.1 9H2.5M13.4 4.6l-1.1 1.1M5.7 12.3l-1.1 1.1M13.4 13.4l-1.1-1.1M5.7 5.7L4.6 4.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
};
