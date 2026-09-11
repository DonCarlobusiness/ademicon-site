/* SiteHunter AI — Camada de persistência
   Implementação atual: localStorage (funciona sem backend).
   A API pública abaixo espelha as tabelas previstas em db/schema.sql, de forma
   que a troca por Supabase/PostgreSQL exija apenas reescrever os métodos de
   acesso — nenhuma view precisa mudar. Ver js/integrations.js. */
(function (global) {
  'use strict';

  var NS = 'sitehunter.v1';
  var COLECOES = ['users', 'session', 'companies', 'digital_audits', 'leads',
                  'crm_events', 'demos', 'proposals', 'messages', 'settings'];

  var cache = null;
  var listeners = [];

  function vazio() {
    return {
      users: [], session: null, companies: [], digital_audits: [], leads: [],
      crm_events: [], demos: [], proposals: [], messages: [],
      settings: {
        tema: 'light',
        consultor: { nome: 'Carlos Eduardo', empresa: 'SiteHunter AI', telefone: '', email: '' },
        pacotes: null,
        lgpdAceito: false,
        optOut: []
      },
      _seed: 0
    };
  }

  function ler() {
    if (cache) return cache;
    try {
      var raw = global.localStorage.getItem(NS);
      cache = raw ? JSON.parse(raw) : vazio();
    } catch (err) {
      console.warn('[SiteHunter] localStorage indisponível — operando apenas em memória.', err);
      cache = vazio();
    }
    COLECOES.forEach(function (k) { if (cache[k] === undefined) cache[k] = (k === 'session' ? null : []); });
    if (!cache.settings || Array.isArray(cache.settings)) cache.settings = vazio().settings;
    return cache;
  }

  function gravar() {
    try {
      global.localStorage.setItem(NS, JSON.stringify(cache));
    } catch (err) {
      console.warn('[SiteHunter] Não foi possível persistir os dados.', err);
    }
    listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  }

  function uid(prefixo) {
    return (prefixo || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function agora() { return new Date().toISOString(); }

  /* ---------- Semente de demonstração ---------- */
  function semear(forcar) {
    var db = ler();
    if (db._seed === 3 && !forcar) return;

    /* Distribui a descoberta das empresas ao longo dos últimos 30 dias de forma
       determinística, para que o gráfico da Visão Geral leia dados reais do
       store em vez de números gerados na hora da renderização. */
    db.companies = global.Dados.empresas.map(function (c, i) {
      var copia = JSON.parse(JSON.stringify(c));
      var h = 0, j;
      for (j = 0; j < c.id.length; j++) h = (h * 31 + c.id.charCodeAt(j)) >>> 0;
      var diasAtras = (h + i * 7) % 30;
      var hora = 8 + (h % 10);
      var d = new Date(Date.now() - diasAtras * 864e5);
      d.setHours(hora, (h % 60), 0, 0);
      copia.descoberto_em = d.toISOString();
      return copia;
    });

    db.digital_audits = db.companies.map(function (c) {
      return {
        id: uid('aud'), company_id: c.id, indice: c.presenca.indice,
        itens: c.presenca.itens, recomendacao: c.presenca.recomendacao,
        score: c.score, score_faixa: c.scoreFaixa, detalhes: c.scoreDetalhes,
        fonte: 'Análise heurística sobre dados cadastrais e canais públicos',
        created_at: agora()
      };
    });

    /* Leads iniciais distribuídos pelo funil, para o CRM não nascer vazio */
    var distribuicao = [
      ['c001', 'demo'], ['c004', 'contatado'], ['c005', 'analisado'], ['c007', 'respondeu'],
      ['c010', 'proposta'], ['c012', 'novo'], ['c013', 'reuniao'], ['c017', 'demo'],
      ['c002', 'analisado'], ['c021', 'fechado'], ['c024', 'contatado'], ['c030', 'novo'],
      ['c009', 'perdido'], ['c022', 'analisado'], ['c016', 'respondeu']
    ];
    db.leads = [];
    db.crm_events = [];
    distribuicao.forEach(function (par, i) {
      var emp = encontrarEmpresa(par[0], db);
      if (!emp) return;
      var dias = 29 - i * 2;
      var criado = new Date(Date.now() - dias * 864e5).toISOString();
      var lead = {
        id: uid('lead'), company_id: emp.id, estagio: par[1],
        valor_potencial: emp.valorPotencial,
        ultimo_contato: (['novo', 'analisado'].indexOf(par[1]) === -1) ? criado : null,
        proxima_acao: proximaAcaoPadrao(par[1]),
        owner: 'demo', created_at: criado, updated_at: criado, notas: ''
      };
      db.leads.push(lead);
      db.crm_events.push({
        id: uid('ev'), lead_id: lead.id, company_id: emp.id, tipo: 'criacao',
        de: null, para: par[1], descricao: 'Lead adicionado ao CRM a partir do Radar de Empresas',
        created_at: criado
      });
    });

    /* Demos e propostas de exemplo, coerentes com os estágios acima */
    db.demos = [];
    ['c001', 'c017'].forEach(function (cid) {
      var emp = encontrarEmpresa(cid, db);
      if (!emp) return;
      db.demos.push({
        id: uid('demo'), company_id: cid, slug: slugify(emp.nome),
        template: 'institucional', status: 'pronta',
        created_at: new Date(Date.now() - 6 * 864e5).toISOString(),
        enviada_em: null, visualizacoes: 0
      });
    });

    db.proposals = [];
    var propEmp = encontrarEmpresa('c010', db);
    if (propEmp) {
      db.proposals.push({
        id: uid('prop'), company_id: 'c010', pacote: 'profissional',
        pacote_nome: 'SITE PROFISSIONAL', valor: 997, prazo: '12 dias úteis',
        status: 'enviada', observacoes: '',
        created_at: new Date(Date.now() - 4 * 864e5).toISOString()
      });
    }
    var propFechada = encontrarEmpresa('c021', db);
    if (propFechada) {
      db.proposals.push({
        id: uid('prop'), company_id: 'c021', pacote: 'premium',
        pacote_nome: 'SITE PREMIUM', valor: 1497, prazo: '20 dias úteis',
        status: 'aceita', observacoes: 'Fechado com entrada de 50%.',
        created_at: new Date(Date.now() - 11 * 864e5).toISOString()
      });
    }

    db.messages = [];
    db._seed = 3;
    gravar();
  }

  function encontrarEmpresa(id, db) {
    db = db || ler();
    for (var i = 0; i < db.companies.length; i++) if (db.companies[i].id === id) return db.companies[i];
    return null;
  }

  function proximaAcaoPadrao(estagio) {
    var m = {
      novo: 'Analisar presença digital',
      analisado: 'Criar site demonstração',
      demo: 'Enviar abordagem por WhatsApp',
      contatado: 'Aguardar retorno / follow-up em 2 dias',
      respondeu: 'Agendar reunião de apresentação',
      reuniao: 'Enviar proposta comercial',
      proposta: 'Follow-up da proposta',
      fechado: 'Iniciar produção do site',
      perdido: 'Reativar em 90 dias'
    };
    return m[estagio] || '';
  }

  function slugify(t) {
    return (t || '').toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  /* ---------- API ---------- */
  var Store = {
    uid: uid,
    agora: agora,
    slugify: slugify,
    semear: semear,
    onChange: function (fn) { listeners.push(fn); },
    raw: ler,
    salvar: gravar,

    /* --- users / session --- */
    registrar: function (nome, email, senha) {
      var db = ler();
      email = (email || '').trim().toLowerCase();
      if (db.users.some(function (u) { return u.email === email; })) {
        return { ok: false, erro: 'Já existe uma conta com este e-mail.' };
      }
      var u = { id: uid('usr'), nome: nome, email: email, senha_hash: hashSimples(senha), created_at: agora() };
      db.users.push(u);
      db.session = { user_id: u.id, iniciada_em: agora() };
      gravar();
      return { ok: true, user: u };
    },
    entrar: function (email, senha) {
      var db = ler();
      email = (email || '').trim().toLowerCase();
      var u = db.users.filter(function (x) { return x.email === email; })[0];
      if (!u) return { ok: false, erro: 'E-mail não encontrado. Verifique ou crie uma conta.' };
      if (u.senha_hash !== hashSimples(senha)) return { ok: false, erro: 'Senha incorreta.' };
      db.session = { user_id: u.id, iniciada_em: agora() };
      gravar();
      return { ok: true, user: u };
    },
    entrarDemo: function () {
      var db = ler();
      var u = db.users.filter(function (x) { return x.email === 'demo@sitehunter.ai'; })[0];
      if (!u) {
        u = { id: uid('usr'), nome: 'Consultor Demonstração', email: 'demo@sitehunter.ai',
              senha_hash: hashSimples('demo1234'), created_at: agora() };
        db.users.push(u);
      }
      db.session = { user_id: u.id, iniciada_em: agora() };
      gravar();
      return { ok: true, user: u };
    },
    sair: function () { var db = ler(); db.session = null; gravar(); },
    usuario: function () {
      var db = ler();
      if (!db.session) return null;
      return db.users.filter(function (u) { return u.id === db.session.user_id; })[0] || null;
    },
    autenticado: function () { return !!Store.usuario(); },

    /* --- companies --- */
    empresas: function () { return ler().companies; },
    empresa: function (id) { return encontrarEmpresa(id); },
    adicionarEmpresas: function (lista) {
      var db = ler(), add = 0, dup = 0;
      lista.forEach(function (c) {
        var jaExiste = db.companies.some(function (x) {
          return (c.cnpj && x.cnpj === c.cnpj) ||
                 (x.nome.toLowerCase() === (c.nome || '').toLowerCase() && x.cidade === c.cidade);
        });
        if (jaExiste) { dup++; return; }
        c.id = c.id || uid('c');
        c.descoberto_em = c.descoberto_em || agora();
        global.Dados.preparar(c);
        db.companies.push(c);
        db.digital_audits.push({
          id: uid('aud'), company_id: c.id, indice: c.presenca.indice, itens: c.presenca.itens,
          recomendacao: c.presenca.recomendacao, score: c.score, score_faixa: c.scoreFaixa,
          detalhes: c.scoreDetalhes, fonte: c.origem || 'Importação CSV', created_at: agora()
        });
        add++;
      });
      gravar();
      return { adicionadas: add, duplicadas: dup };
    },
    auditoria: function (companyId) {
      var db = ler();
      var lista = db.digital_audits.filter(function (a) { return a.company_id === companyId; });
      return lista[lista.length - 1] || null;
    },

    /* --- leads / crm --- */
    leads: function () { return ler().leads; },
    leadDaEmpresa: function (companyId) {
      return ler().leads.filter(function (l) { return l.company_id === companyId; })[0] || null;
    },
    criarLead: function (companyId, estagio) {
      var db = ler();
      var existente = Store.leadDaEmpresa(companyId);
      if (existente) return { ok: false, erro: 'Empresa já está no CRM.', lead: existente };
      var emp = encontrarEmpresa(companyId);
      if (!emp) return { ok: false, erro: 'Empresa não encontrada.' };
      var lead = {
        id: uid('lead'), company_id: companyId, estagio: estagio || 'novo',
        valor_potencial: emp.valorPotencial, ultimo_contato: null,
        proxima_acao: proximaAcaoPadrao(estagio || 'novo'),
        owner: (Store.usuario() || {}).id || 'demo',
        created_at: agora(), updated_at: agora(), notas: ''
      };
      db.leads.push(lead);
      Store.registrarEvento(lead.id, companyId, 'criacao', null, lead.estagio,
        'Empresa adicionada ao CRM');
      gravar();
      return { ok: true, lead: lead };
    },
    moverLead: function (leadId, estagio) {
      var db = ler();
      var lead = db.leads.filter(function (l) { return l.id === leadId; })[0];
      if (!lead || lead.estagio === estagio) return null;
      var de = lead.estagio;
      lead.estagio = estagio;
      lead.updated_at = agora();
      lead.proxima_acao = proximaAcaoPadrao(estagio);
      if (['contatado', 'respondeu', 'reuniao', 'proposta', 'fechado'].indexOf(estagio) !== -1) {
        lead.ultimo_contato = agora();
      }
      Store.registrarEvento(lead.id, lead.company_id, 'mudanca_estagio', de, estagio,
        'Movido de ' + rotuloEstagio(de) + ' para ' + rotuloEstagio(estagio));
      gravar();
      return lead;
    },
    atualizarLead: function (leadId, patch) {
      var db = ler();
      var lead = db.leads.filter(function (l) { return l.id === leadId; })[0];
      if (!lead) return null;
      Object.keys(patch).forEach(function (k) { lead[k] = patch[k]; });
      lead.updated_at = agora();
      gravar();
      return lead;
    },
    removerLead: function (leadId) {
      var db = ler();
      db.leads = db.leads.filter(function (l) { return l.id !== leadId; });
      gravar();
    },
    registrarEvento: function (leadId, companyId, tipo, de, para, descricao) {
      var db = ler();
      db.crm_events.push({
        id: uid('ev'), lead_id: leadId, company_id: companyId, tipo: tipo,
        de: de, para: para, descricao: descricao, created_at: agora()
      });
      gravar();
    },
    eventos: function (companyId) {
      return ler().crm_events
        .filter(function (e) { return !companyId || e.company_id === companyId; })
        .sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
    },

    /* --- demos --- */
    demos: function () { return ler().demos; },
    demoDaEmpresa: function (companyId) {
      var lista = ler().demos.filter(function (d) { return d.company_id === companyId; });
      return lista[lista.length - 1] || null;
    },
    criarDemo: function (companyId, template) {
      var db = ler();
      var emp = encontrarEmpresa(companyId);
      if (!emp) return null;
      var existente = Store.demoDaEmpresa(companyId);
      if (existente) return existente;
      var d = {
        id: uid('demo'), company_id: companyId, slug: slugify(emp.nome),
        template: template || 'institucional', status: 'pronta',
        created_at: agora(), enviada_em: null, visualizacoes: 0
      };
      db.demos.push(d);
      var lead = Store.leadDaEmpresa(companyId);
      if (lead && ['novo', 'analisado'].indexOf(lead.estagio) !== -1) Store.moverLead(lead.id, 'demo');
      gravar();
      return d;
    },
    marcarDemoEnviada: function (demoId) {
      var db = ler();
      var d = db.demos.filter(function (x) { return x.id === demoId; })[0];
      if (!d) return null;
      d.enviada_em = agora();
      d.status = 'enviada';
      gravar();
      return d;
    },
    removerDemo: function (demoId) {
      var db = ler();
      db.demos = db.demos.filter(function (d) { return d.id !== demoId; });
      gravar();
    },

    /* --- proposals --- */
    propostas: function () { return ler().proposals; },
    criarProposta: function (p) {
      var db = ler();
      p.id = uid('prop');
      p.created_at = agora();
      p.status = p.status || 'rascunho';
      db.proposals.push(p);
      var lead = Store.leadDaEmpresa(p.company_id);
      if (lead && ['fechado', 'perdido'].indexOf(lead.estagio) === -1) Store.moverLead(lead.id, 'proposta');
      gravar();
      return p;
    },
    atualizarProposta: function (id, patch) {
      var db = ler();
      var p = db.proposals.filter(function (x) { return x.id === id; })[0];
      if (!p) return null;
      Object.keys(patch).forEach(function (k) { p[k] = patch[k]; });
      gravar();
      return p;
    },
    removerProposta: function (id) {
      var db = ler();
      db.proposals = db.proposals.filter(function (p) { return p.id !== id; });
      gravar();
    },

    /* --- messages --- */
    registrarMensagem: function (companyId, estilo, texto, canal) {
      var db = ler();
      var m = { id: uid('msg'), company_id: companyId, estilo: estilo, canal: canal || 'whatsapp',
                texto: texto, created_at: agora() };
      db.messages.push(m);
      gravar();
      return m;
    },
    mensagens: function (companyId) {
      return ler().messages.filter(function (m) { return !companyId || m.company_id === companyId; });
    },

    /* --- settings --- */
    config: function () { return ler().settings; },
    salvarConfig: function (patch) {
      var db = ler();
      Object.keys(patch).forEach(function (k) { db.settings[k] = patch[k]; });
      gravar();
      return db.settings;
    },
    pacotes: function () {
      var s = ler().settings;
      return s.pacotes && s.pacotes.length ? s.pacotes : global.Dados.pacotes;
    },
    optOut: function (identificador) {
      var db = ler();
      if (db.settings.optOut.indexOf(identificador) === -1) db.settings.optOut.push(identificador);
      gravar();
    },
    estaOptOut: function (identificador) {
      return ler().settings.optOut.indexOf(identificador) !== -1;
    },

    /* --- manutenção --- */
    limparTudo: function () {
      cache = vazio();
      gravar();
      semear(true);
    },
    exportar: function () { return JSON.stringify(ler(), null, 2); }
  };

  function rotuloEstagio(id) {
    var e = global.Dados.estagios.filter(function (x) { return x.id === id; })[0];
    return e ? e.nome : (id || '—');
  }

  /* Hash didático apenas para separar contas na demonstração local.
     NÃO é segurança real — a autenticação de produção deve ficar no backend
     (Supabase Auth / servidor próprio). Ver js/integrations.js. */
  function hashSimples(s) {
    var h = 5381, i;
    s = 'sh::' + (s || '');
    for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  Store.rotuloEstagio = rotuloEstagio;
  global.Store = Store;
})(window);
