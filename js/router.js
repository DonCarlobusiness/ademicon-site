/* SiteHunter AI — Roteador por hash (sem dependências, funciona em host estático) */
(function (global) {
  'use strict';

  var rotas = [];
  var rotaAtual = null;

  function registrar(padrao, handler, opcoes) {
    var partes = padrao.split('/').filter(Boolean);
    rotas.push({ padrao: padrao, partes: partes, handler: handler, opcoes: opcoes || {} });
  }

  function caminhoAtual() {
    var h = global.location.hash.replace(/^#/, '');
    if (!h || h === '/') return '/';
    return h;
  }

  function casar(caminho) {
    var partes = caminho.split('?')[0].split('/').filter(Boolean);
    for (var i = 0; i < rotas.length; i++) {
      var r = rotas[i];
      if (r.partes.length !== partes.length) continue;
      var params = {}, ok = true;
      for (var j = 0; j < r.partes.length; j++) {
        var p = r.partes[j];
        if (p.charAt(0) === ':') params[p.slice(1)] = decodeURIComponent(partes[j]);
        else if (p !== partes[j]) { ok = false; break; }
      }
      if (ok) return { rota: r, params: params, query: parseQuery(caminho) };
    }
    return null;
  }

  function parseQuery(caminho) {
    var i = caminho.indexOf('?');
    var q = {};
    if (i === -1) return q;
    caminho.slice(i + 1).split('&').forEach(function (par) {
      if (!par) return;
      var kv = par.split('=');
      q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return q;
  }

  function ir(caminho, substituir) {
    if (substituir) global.location.replace('#' + caminho);
    else global.location.hash = caminho;
  }

  function resolver() {
    var caminho = caminhoAtual();
    var m = casar(caminho);

    if (!m) {
      if (global.Store.autenticado()) ir('/app/visao-geral', true);
      else ir('/', true);
      return;
    }

    /* Guarda de autenticação */
    if (m.rota.opcoes.protegida && !global.Store.autenticado()) {
      ir('/entrar?destino=' + encodeURIComponent(caminho), true);
      return;
    }
    if (m.rota.opcoes.somenteVisitante && global.Store.autenticado()) {
      ir('/app/visao-geral', true);
      return;
    }

    rotaAtual = { caminho: caminho, params: m.params, query: m.query, padrao: m.rota.padrao };
    try {
      m.rota.handler(m.params, m.query);
    } catch (err) {
      console.error('[SiteHunter] Falha ao renderizar a rota ' + caminho, err);
      document.getElementById('root').innerHTML =
        '<div style="padding:60px 24px;text-align:center;font-family:Inter,sans-serif">' +
        '<h2 style="margin-bottom:10px">Não foi possível carregar esta tela</h2>' +
        '<p style="color:#64748b;font-size:14px;margin-bottom:18px">' +
        (global.UI ? global.UI.esc(err.message) : '') + '</p>' +
        '<a href="#/app/visao-geral" style="color:#059669;font-weight:600">Voltar para a Visão Geral</a></div>';
    }
    global.scrollTo({ top: 0, behavior: 'instant' in global ? 'instant' : 'auto' });
  }

  function iniciar() {
    global.addEventListener('hashchange', resolver);
    resolver();
  }

  global.Router = {
    registrar: registrar, ir: ir, iniciar: iniciar, resolver: resolver,
    atual: function () { return rotaAtual; }
  };
})(window);
