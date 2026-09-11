/* SiteHunter AI — Bootstrap, shell do aplicativo e registro de rotas */
(function (global) {
  'use strict';

  var NAV = [
    { grupo: 'Prospecção' },
    { id: 'visao-geral',   rota: '/app/visao-geral',   icone: 'grid',    rotulo: 'Visão Geral' },
    { id: 'radar',         rota: '/app/radar',         icone: 'radar',   rotulo: 'Radar de Empresas' },
    { id: 'oportunidades', rota: '/app/oportunidades', icone: 'trophy',  rotulo: 'Oportunidades' },
    { grupo: 'Conversão' },
    { id: 'crm',           rota: '/app/crm',           icone: 'kanban',  rotulo: 'CRM' },
    { id: 'demos',         rota: '/app/demos',         icone: 'layout',  rotulo: 'Sites Demo' },
    { id: 'propostas',     rota: '/app/propostas',     icone: 'doc',     rotulo: 'Propostas' },
    { id: 'financeiro',    rota: '/app/financeiro',    icone: 'money',   rotulo: 'Painel Financeiro' },
    { grupo: 'Dados' },
    { id: 'importar',      rota: '/app/importar',      icone: 'upload',  rotulo: 'Importar Leads' },
    { id: 'configuracoes', rota: '/app/configuracoes', icone: 'settings', rotulo: 'Configurações' }
  ];

  var shellMontado = false;

  /* ---------------- Shell ---------------- */
  function montarShell() {
    var root = document.getElementById('root');
    if (shellMontado && root.querySelector('.app-shell')) return root.querySelector('#page');

    root.innerHTML =
      '<div class="app-shell">' +
        '<aside class="sidebar" id="sidebar">' +
          '<a href="#/app/visao-geral" class="sidebar-brand">' +
            '<span class="brand-mark">' + global.ico('radar', 19) + '</span>' +
            '<span class="brand-name">SiteHunter<span>Prospecção digital</span></span>' +
          '</a>' +
          '<nav class="sidebar-nav" id="nav"></nav>' +
          '<div class="sidebar-foot">' +
            '<button class="user-box" id="btn-usuario">' +
              '<span class="avatar" id="av"></span>' +
              '<span style="min-width:0;flex:1"><span class="user-name truncate" id="un"></span>' +
              '<span class="user-mail truncate" id="um"></span></span>' +
              global.ico('chevronRight', 15) +
            '</button>' +
          '</div>' +
        '</aside>' +
        '<div class="main">' +
          '<header class="topbar">' +
            '<button class="burger" id="burger" aria-label="Abrir menu">' + global.ico('menu', 19) + '</button>' +
            '<div class="search-global">' + global.ico('search', 17) +
              '<input type="search" id="busca" placeholder="Buscar empresa, CNPJ, cidade ou telefone…" ' +
              'autocomplete="off" aria-label="Busca global">' +
              '<span class="kbd">/</span>' +
              '<div id="busca-res" hidden></div>' +
            '</div>' +
            '<div class="topbar-actions">' +
              '<button class="btn btn-ghost btn-icon" id="btn-tema" aria-label="Alternar tema"></button>' +
            '</div>' +
          '</header>' +
          '<div class="page" id="page"></div>' +
        '</div>' +
      '</div>';

    shellMontado = true;
    ligarShell();
    return root.querySelector('#page');
  }

  function ligarShell() {
    var root = document.getElementById('root');
    var sidebar = root.querySelector('#sidebar');
    var burger = root.querySelector('#burger');

    burger.addEventListener('click', function () {
      sidebar.classList.add('open');
      var scrim = document.createElement('div');
      scrim.className = 'scrim';
      scrim.addEventListener('click', fecharMenu);
      root.querySelector('.app-shell').appendChild(scrim);
    });

    function fecharMenu() {
      sidebar.classList.remove('open');
      var s = root.querySelector('.scrim');
      if (s) s.remove();
    }
    global.__fecharMenu = fecharMenu;

    root.querySelector('#nav').addEventListener('click', function (e) {
      if (e.target.closest('.nav-item')) fecharMenu();
    });

    var btTema = root.querySelector('#btn-tema');
    function pintarTema() {
      btTema.innerHTML = global.ico(global.Store.config().tema === 'dark' ? 'sun' : 'moon', 17);
    }
    pintarTema();
    btTema.addEventListener('click', function () { global.UI.alternarTema(); pintarTema(); });

    root.querySelector('#btn-usuario').addEventListener('click', menuUsuario);

    ligarBusca(root);
  }

  function menuUsuario() {
    var u = global.Store.usuario() || { nome: '—', email: '—' };
    global.UI.modal({
      titulo: u.nome,
      subtitulo: u.email,
      corpo:
        '<div style="display:flex;flex-direction:column;gap:8px">' +
          '<a href="#/app/configuracoes" class="btn btn-ghost btn-block" data-fechar style="justify-content:flex-start">' +
            global.ico('settings', 17) + ' Configurações da conta</a>' +
          '<a href="#/legal/privacidade" class="btn btn-ghost btn-block" data-fechar style="justify-content:flex-start">' +
            global.ico('shield', 17) + ' Privacidade e LGPD</a>' +
          '<button class="btn btn-ghost btn-block" id="u-exportar" style="justify-content:flex-start">' +
            global.ico('download', 17) + ' Exportar meus dados (JSON)</button>' +
        '</div>',
      rodape: '<button class="btn btn-ghost" data-fechar>Fechar</button>' +
              '<button class="btn btn-danger" id="u-sair">' + global.ico('logout', 16) + ' Sair da conta</button>',
      aoAbrir: function (m) {
        m.querySelector('#u-sair').addEventListener('click', function () {
          global.UI.fecharModal();
          global.Store.sair();
          shellMontado = false;
          global.Router.ir('/');
          global.UI.toast('Sessão encerrada.', 'info');
        });
        m.querySelector('#u-exportar').addEventListener('click', function () {
          baixar('sitehunter-dados.json', global.Store.exportar(), 'application/json');
          global.UI.toast('Arquivo gerado com todos os seus dados locais.');
        });
      }
    });
  }

  function baixar(nome, conteudo, tipo) {
    var blob = new Blob([conteudo], { type: tipo || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /* ---------------- Navegação ---------------- */
  function pintarNav(ativo) {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var leads = global.Store.leads();
    var contagens = {
      radar: global.Store.empresas().length,
      crm: leads.filter(function (l) { return ['fechado', 'perdido'].indexOf(l.estagio) === -1; }).length,
      demos: global.Store.demos().length,
      propostas: global.Store.propostas().length
    };

    nav.innerHTML = NAV.map(function (item) {
      if (item.grupo) return '<div class="nav-group-label">' + global.UI.esc(item.grupo) + '</div>';
      var c = contagens[item.id];
      return '<a class="nav-item ' + (item.id === ativo ? 'active' : '') + '" href="#' + item.rota + '">' +
        global.ico(item.icone, 18) + '<span>' + global.UI.esc(item.rotulo) + '</span>' +
        (c ? '<span class="nav-count">' + c + '</span>' : '') + '</a>';
    }).join('');

    var u = global.Store.usuario();
    if (u) {
      document.getElementById('av').textContent = global.UI.iniciais(u.nome);
      document.getElementById('un').textContent = u.nome;
      document.getElementById('um').textContent = u.email;
    }
  }

  /* ---------------- Busca global ---------------- */
  function ligarBusca(root) {
    var input = root.querySelector('#busca');
    var caixa = root.querySelector('#busca-res');
    var sel = -1, resultados = [];

    function fechar() { caixa.hidden = true; caixa.innerHTML = ''; sel = -1; resultados = []; }

    function buscar(termo) {
      var t = termo.trim().toLowerCase();
      if (t.length < 2) { fechar(); return; }
      var tDig = global.UI.soDigitos(t);

      resultados = global.Store.empresas().filter(function (c) {
        if (c.nome.toLowerCase().indexOf(t) !== -1) return true;
        if ((c.razaoSocial || '').toLowerCase().indexOf(t) !== -1) return true;
        if (c.cidade.toLowerCase().indexOf(t) !== -1) return true;
        if ((c.segmento || '').toLowerCase().indexOf(t) !== -1) return true;
        if (tDig.length >= 3) {
          if (global.UI.soDigitos(c.cnpj).indexOf(tDig) !== -1) return true;
          if (global.UI.soDigitos(c.telefone).indexOf(tDig) !== -1) return true;
          if (global.UI.soDigitos(c.whatsapp).indexOf(tDig) !== -1) return true;
        }
        return false;
      }).slice(0, 8);

      caixa.className = 'search-results';
      caixa.hidden = false;
      if (!resultados.length) {
        caixa.innerHTML = '<div class="sr-empty">Nenhuma empresa encontrada para “' +
          global.UI.esc(termo) + '”.</div>';
        return;
      }
      caixa.innerHTML = resultados.map(function (c, i) {
        return '<a class="sr-item" href="#/app/empresa/' + c.id + '" data-i="' + i + '">' +
          global.UI.logoEmpresa(c.nome) +
          '<span style="flex:1;min-width:0"><span class="sr-title truncate" style="display:block">' +
          global.UI.esc(c.nome) + '</span>' +
          '<span class="sr-meta">' + global.UI.esc(c.cidade) + '/' + global.UI.esc(c.uf) +
          ' · ' + global.UI.esc(c.segmento) + ' · ' + global.UI.esc(c.cnpj) + '</span></span>' +
          global.UI.scoreCelula(c.score) + '</a>';
      }).join('');
    }

    input.addEventListener('input', function () { buscar(input.value); });
    input.addEventListener('focus', function () { if (input.value.trim().length >= 2) buscar(input.value); });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.blur(); fechar(); return; }
      if (!resultados.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sel = e.key === 'ArrowDown'
          ? Math.min(sel + 1, resultados.length - 1)
          : Math.max(sel - 1, 0);
        caixa.querySelectorAll('.sr-item').forEach(function (el, i) {
          el.classList.toggle('sel', i === sel);
          if (i === sel) el.scrollIntoView({ block: 'nearest' });
        });
      } else if (e.key === 'Enter' && sel >= 0) {
        e.preventDefault();
        global.Router.ir('/app/empresa/' + resultados[sel].id);
        input.value = ''; input.blur(); fechar();
      }
    });

    caixa.addEventListener('click', function () { input.value = ''; setTimeout(fechar, 10); });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-global')) fechar();
    });

    /* Atalho "/" para focar a busca */
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      var a = document.activeElement;
      if (a && /input|textarea|select/i.test(a.tagName)) return;
      if (document.querySelector('.modal-backdrop')) return;
      var busca = document.getElementById('busca');
      if (busca) { e.preventDefault(); busca.focus(); }
    });
  }

  /* ---------------- Registro de rotas ---------------- */
  function telaApp(id, render) {
    return function (params, query) {
      var page = montarShell();
      pintarNav(id);
      render(page, params, query);
    };
  }

  function telaPublica(render) {
    return function (params, query) {
      shellMontado = false;
      var root = document.getElementById('root');
      render(root, params, query);
    };
  }

  function registrarRotas() {
    var R = global.Router;
    var V = global.Views;

    R.registrar('/', telaPublica(V.landing));
    R.registrar('/entrar', telaPublica(V.entrar), { somenteVisitante: false });
    R.registrar('/criar-conta', telaPublica(V.criarConta));
    R.registrar('/recuperar-senha', telaPublica(V.recuperarSenha));

    R.registrar('/legal/:doc', telaPublica(V.legal));

    R.registrar('/app/visao-geral',   telaApp('visao-geral', V.visaoGeral),     { protegida: true });
    R.registrar('/app/radar',         telaApp('radar', V.radar),                { protegida: true });
    R.registrar('/app/oportunidades', telaApp('oportunidades', V.oportunidades), { protegida: true });
    R.registrar('/app/crm',           telaApp('crm', V.crm),                    { protegida: true });
    R.registrar('/app/demos',         telaApp('demos', V.demos),                { protegida: true });
    R.registrar('/app/propostas',     telaApp('propostas', V.propostas),        { protegida: true });
    R.registrar('/app/financeiro',    telaApp('financeiro', V.financeiro),      { protegida: true });
    R.registrar('/app/importar',      telaApp('importar', V.importar),          { protegida: true });
    R.registrar('/app/configuracoes', telaApp('configuracoes', V.configuracoes), { protegida: true });
    R.registrar('/app/empresa/:id',   telaApp('radar', V.empresa),              { protegida: true });
    R.registrar('/app/proposta/:id',  telaApp('propostas', V.proposta),         { protegida: true });
    R.registrar('/demo/:demoId/:companyId', telaApp('demos', V.verDemo),        { protegida: true });
  }

  /* ---------------- Banner LGPD ---------------- */
  function bannerLGPD() {
    if (global.Store.config().lgpdAceito) return;
    var bar = document.createElement('div');
    bar.className = 'lgpd-bar';
    document.body.classList.add('com-lgpd');
    bar.innerHTML =
      '<span style="flex:1;min-width:240px">Este aplicativo guarda seus dados de prospecção apenas no ' +
      'armazenamento local deste navegador. Consulte a <a href="#/legal/privacidade">Política de Privacidade</a>, ' +
      'a <a href="#/legal/dados">origem dos dados</a> e as opções de <a href="#/legal/remocao">remoção e opt-out</a>.</span>' +
      '<button class="btn btn-primary btn-sm" id="lgpd-ok">Entendi</button>';
    document.body.appendChild(bar);
    bar.querySelector('#lgpd-ok').addEventListener('click', function () {
      global.Store.salvarConfig({ lgpdAceito: true });
      document.body.classList.remove('com-lgpd');
      bar.remove();
    });
  }

  /* ---------------- Início ---------------- */
  function iniciar() {
    global.Store.semear();
    global.UI.aplicarTema(global.Store.config().tema);
    registrarRotas();
    global.Router.iniciar();
    bannerLGPD();

    global.App = {
      pintarNav: pintarNav,
      baixar: baixar,
      recarregar: function () { global.Router.resolver(); }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(window);
