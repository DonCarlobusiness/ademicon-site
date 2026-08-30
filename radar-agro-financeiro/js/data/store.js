import { RESEARCHED_COMPANIES } from './seed.js';
import { normCnpj } from './schema.js';
import { scoreCompany } from '../services/scoring.js';

const LS_KEYS = {
  imported: 'terraOeste.imported.v2',
  crm: 'terraOeste.crmState.v2',
  audit: 'terraOeste.auditLog.v2',
  importHistory: 'terraOeste.importHistory.v2',
  lastUpdate: 'terraOeste.lastUpdate.v2',
  settings: 'terraOeste.settings.v2',
};

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage indisponível (modo privado etc.) — segue apenas em memória */
  }
}

class Store {
  constructor() {
    this._imported = readLS(LS_KEYS.imported, []);
    this._crmOverrides = readLS(LS_KEYS.crm, {}); // cnpj -> {statusCrm, crmResponsavel, ultimaInteracao, proximaAcao, notasCrm, historicoCrm, naoContatar, optOut}
    this._auditLog = readLS(LS_KEYS.audit, []);
    this._importHistory = readLS(LS_KEYS.importHistory, []);
    this._lastUpdate = readLS(LS_KEYS.lastUpdate, null);
    this.settings = readLS(LS_KEYS.settings, { autoUpdate: false, purposeOfProcessing: 'Prospecção B2B de empresas do agronegócio com sinais públicos de reestruturação financeira.' });
    this._listeners = new Set();
    this._recompute();
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
  _emit() {
    this._listeners.forEach((fn) => fn(this));
  }

  _recompute() {
    const map = new Map();
    RESEARCHED_COMPANIES.forEach((c) => map.set(normCnpj(c.cnpj), { ...c }));
    this._imported.forEach((c) => {
      const key = normCnpj(c.cnpj);
      if (!key) return;
      const existing = map.get(key);
      map.set(key, existing ? mergePreferBetter(existing, c) : c);
    });
    // aplica overrides de CRM (persistidos separadamente para não se perder em reimportações)
    for (const [cnpj, patch] of Object.entries(this._crmOverrides)) {
      const rec = map.get(cnpj);
      if (rec) Object.assign(rec, patch);
    }
    this.companies = [...map.values()].map((c) => ({ ...c, id: normCnpj(c.cnpj), score: scoreCompany(c) }));
  }

  getCompanies() {
    return this.companies;
  }
  getCompany(cnpjLike) {
    const key = normCnpj(cnpjLike);
    return this.companies.find((c) => c.id === key);
  }

  updateCrm(cnpjLike, patch) {
    const key = normCnpj(cnpjLike);
    this._crmOverrides[key] = { ...(this._crmOverrides[key] || {}), ...patch };
    writeLS(LS_KEYS.crm, this._crmOverrides);
    this._recompute();
    this.logAudit({ action: 'crm_update', target: key, detail: Object.keys(patch).join(', ') });
    this._emit();
  }

  mergeImportedCompanies(rows) {
    this._imported = mergeCompanyLists(this._imported, rows);
    writeLS(LS_KEYS.imported, this._imported);
    this._recompute();
    this._emit();
  }

  recordImport(entry) {
    this._importHistory.unshift({ ...entry, at: new Date().toISOString() });
    this._importHistory = this._importHistory.slice(0, 30);
    writeLS(LS_KEYS.importHistory, this._importHistory);
    this._emit();
  }
  getImportHistory() {
    return this._importHistory;
  }

  logAudit(entry) {
    this._auditLog.unshift({ ...entry, at: new Date().toISOString() });
    this._auditLog = this._auditLog.slice(0, 200);
    writeLS(LS_KEYS.audit, this._auditLog);
  }
  getAuditLog() {
    return this._auditLog;
  }

  touchLastUpdate() {
    this._lastUpdate = new Date().toISOString();
    writeLS(LS_KEYS.lastUpdate, this._lastUpdate);
    this._emit();
  }
  getLastUpdate() {
    return this._lastUpdate;
  }

  saveSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    writeLS(LS_KEYS.settings, this.settings);
    this._emit();
  }

  resetImportedData() {
    this._imported = [];
    this._crmOverrides = {};
    writeLS(LS_KEYS.imported, []);
    writeLS(LS_KEYS.crm, {});
    this._recompute();
    this.logAudit({ action: 'reset_imported_data', target: 'all', detail: 'Dados importados e overrides de CRM apagados pelo usuário.' });
    this._emit();
  }
}

function mergePreferBetter(base, incoming) {
  const out = { ...base };
  for (const [k, v] of Object.entries(incoming)) {
    if (v === undefined || v === null || v === '') continue; // nunca apaga um campo bom com um vazio
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  out.cnpj = base.cnpj || incoming.cnpj;
  return out;
}

function mergeCompanyLists(base, add) {
  const map = new Map();
  base.forEach((c) => map.set(normCnpj(c.cnpj), c));
  add.forEach((c) => {
    const key = normCnpj(c.cnpj);
    if (!key) return;
    map.set(key, map.has(key) ? mergePreferBetter(map.get(key), c) : c);
  });
  return [...map.values()];
}

export const store = new Store();
export { mergeCompanyLists, mergePreferBetter };
