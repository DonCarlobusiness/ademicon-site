/* SiteHunter AI — Tela inicial pública */
(function (global) {
  'use strict';
  global.Views = global.Views || {};
  var U = function () { return global.UI; };

  var FLUXO = [
    { i: 'radar',     t: 'Encontrar empresa' },
    { i: 'globeOff',  t: 'Analisar presença digital' },
    { i: 'target',    t: 'Calcular score' },
    { i: 'layout',    t: 'Criar site demo' },
    { i: 'sparkles',  t: 'Gerar abordagem' },
    { i: 'send',      t: 'Enviar para o cliente' },
    { i: 'doc',       t: 'Proposta' },
    { i: 'handshake', t: 'Fechar venda' }
  ];

  var RECURSOS = [
    { i: 'radar', c: 'emerald', t: 'Radar de empresas',
      d: 'Filtre por estado, cidade, segmento, CNAE e canais de contato. Isole em segundos quem ainda não tem site.' },
    { i: 'target', c: 'sky', t: 'Score de oportunidade',
      d: 'Cada empresa recebe de 0 a 100 pontos com a justificativa item a item. Você sabe exatamente por que ela está no topo.' },
    { i: 'layout', c: 'violet', t: 'Site demonstração',
      d: 'Gere uma prévia navegável do site da empresa com os dados que você já tem e mande o link junto da abordagem.' },
    { i: 'sparkles', c: 'amber', t: 'Abordagem personalizada',
      d: 'Cinco estilos de mensagem, escritos com os dados reais da empresa. Sem elogio genérico e sem informação inventada.' },
    { i: 'kanban', c: 'rose', t: 'CRM de prospecção',
      d: 'Do primeiro lead ao contrato assinado em nove estágios, com valor potencial e próxima ação em cada card.' },
    { i: 'chart', c: 'emerald', t: 'Funil e faturamento',
      d: 'Taxa de resposta, conversão, ticket médio e receita fechada. Saiba qual etapa está travando suas vendas.' }
  ];

  var CORES = {
    emerald: ['var(--accent-soft)', 'var(--accent-hover)'],
    sky: ['var(--sky-soft)', 'var(--sky)'],
    violet: ['var(--violet-soft)', 'var(--violet)'],
    amber: ['var(--amber-soft)', 'var(--amber)'],
    rose: ['var(--rose-soft)', 'var(--rose)']
  };

  global.Views.landing = function (root) {
    var ui = U();
    var totalEmpresas = global.Store.empresas().length;
    var semSite = global.Store.empresas().filter(function (c) { return !c.website; }).length;

    root.innerHTML =
      '<div class="lp">' +

      '<nav class="lp-nav"><div class="lp-nav-in">' +
        '<a href="#/" class="lp-brand">' + marca() + '</a>' +
        '<div class="lp-links">' +
          '<a href="#recursos">Recursos</a><a href="#fluxo">Como funciona</a>' +
          '<a href="#planos">Pacotes</a><a href="#/legal/privacidade">Privacidade</a>' +
        '</div>' +
        '<div class="lp-nav-cta">' +
          '<button class="btn btn-ghost btn-icon" id="lp-tema" aria-label="Alternar tema">' + global.ico('moon', 17) + '</button>' +
          '<a href="#/entrar" class="btn btn-ghost">Entrar</a>' +
          '<a href="#/criar-conta" class="btn btn-primary">Criar conta</a>' +
        '</div>' +
      '</div></nav>' +

      '<header class="hero"><div class="hero-in">' +
        '<div>' +
          '<span class="eyebrow">' + global.ico('bolt', 14) + ' Prospecção para quem vende sites</span>' +
          '<h1>Encontre empresas.<br>Descubra oportunidades.<br><em>Venda sites.</em></h1>' +
          '<p class="hero-sub">Encontre empresas com baixa presença digital, identifique quem ainda não possui ' +
            'site e transforme oportunidades em clientes.</p>' +
          '<div class="hero-cta">' +
            '<a href="#/entrar?demo=1" class="btn btn-primary btn-lg">COMEÇAR A PROSPECTAR ' + global.ico('arrowRight', 17) + '</a>' +
            '<a href="#/entrar?demo=1&destino=' + encodeURIComponent('/app/oportunidades') + '" class="btn btn-ghost btn-lg">VER OPORTUNIDADES</a>' +
          '</div>' +
          '<div class="hero-note">' +
            '<span>' + global.ico('checkCircle', 15) + ' ' + totalEmpresas + ' empresas na base de demonstração</span>' +
            '<span>' + global.ico('checkCircle', 15) + ' Sem cartão de crédito</span>' +
            '<span>' + global.ico('shield', 15) + ' Fontes públicas e oficiais</span>' +
          '</div>' +
        '</div>' +
        '<div>' + mockup(semSite) + '</div>' +
      '</div></header>' +

      '<section class="lp-section alt" id="fluxo"><div>' +
        '<h2 class="lp-h2">Do primeiro filtro ao contrato assinado</h2>' +
        '<p class="lp-lead">Um fluxo único, sem trocar de ferramenta no meio do caminho.</p>' +
        '<div class="flow" style="margin-top:34px;justify-content:center">' +
          FLUXO.map(function (f, i) {
            return '<div class="flow-step"><div class="flow-box">' +
              '<span class="flow-ico">' + global.ico(f.i, 17) + '</span>' +
              '<span class="flow-n">ETAPA ' + (i + 1) + '</span>' +
              '<span class="flow-t">' + ui.esc(f.t) + '</span></div>' +
              (i < FLUXO.length - 1 ? '<span class="flow-arrow">' + global.ico('chevronRight', 17) + '</span>' : '') +
              '</div>';
          }).join('') +
        '</div>' +
      '</div></section>' +

      '<section class="lp-section" id="recursos">' +
        '<h2 class="lp-h2">Tudo o que a prospecção exige</h2>' +
        '<p class="lp-lead">Não é uma lista de contatos. É o ciclo inteiro da venda de sites para negócios locais.</p>' +
        '<div class="grid g-3" style="margin-top:36px">' +
          RECURSOS.map(function (r) {
            var c = CORES[r.c];
            return '<div class="feat"><div class="feat-ico" style="background:' + c[0] + ';color:' + c[1] + '">' +
              global.ico(r.i, 21) + '</div><h3>' + ui.esc(r.t) + '</h3><p>' + ui.esc(r.d) + '</p></div>';
          }).join('') +
        '</div>' +
      '</section>' +

      '<section class="lp-section alt" id="planos"><div>' +
        '<h2 class="lp-h2">Pacotes prontos para você revender</h2>' +
        '<p class="lp-lead">Valores sugeridos e totalmente editáveis dentro do aplicativo.</p>' +
        '<div class="grid g-3" style="margin-top:38px;max-width:1000px;margin-inline:auto">' +
          global.Dados.pacotes.map(function (p) {
            return '<div class="price-card ' + (p.destaque ? 'featured' : '') + '">' +
              (p.destaque ? '<span class="price-tag badge badge-emerald">MAIS VENDIDO</span>' : '') +
              '<div><div class="card-sub" style="margin:0 0 6px">' + ui.esc(p.nome) + '</div>' +
              '<div class="price-val">' + ui.brl(p.valor) + '</div>' +
              '<div class="hint" style="margin-top:5px">Entrega em ' + ui.esc(p.prazo) + '</div></div>' +
              '<ul class="price-list">' + p.itens.map(function (it) {
                return '<li>' + global.ico('check', 15) + '<span>' + ui.esc(it) + '</span></li>';
              }).join('') + '</ul>' +
              '<a href="#/entrar?demo=1" class="btn ' + (p.destaque ? 'btn-primary' : 'btn-ghost') + ' btn-block">Usar este pacote</a>' +
              '</div>';
          }).join('') +
        '</div>' +
      '</div></section>' +

      '<section class="lp-section">' +
        '<div class="cta-band">' +
          '<h2>Comece pela base de demonstração</h2>' +
          '<p>Entre com a conta de demonstração e explore o radar, o score, o CRM e o gerador ' +
          'de sites com ' + totalEmpresas + ' empresas fictícias já carregadas.</p>' +
          '<a href="#/entrar?demo=1" class="btn btn-primary btn-lg">COMEÇAR A PROSPECTAR ' + global.ico('rocket', 17) + '</a>' +
        '</div>' +
      '</section>' +

      '<footer class="lp-foot"><div class="lp-foot-in">' +
        '<div>' + marca(true) + '<p style="margin-top:14px;font-size:13.5px;line-height:1.7;max-width:38ch">' +
          'Prospecção de empresas com baixa presença digital, do primeiro filtro à venda fechada.</p></div>' +
        '<div><h4>Produto</h4><a href="#recursos">Recursos</a><a href="#fluxo">Como funciona</a>' +
          '<a href="#planos">Pacotes</a><a href="#/entrar?demo=1">Demonstração</a></div>' +
        '<div><h4>Legal</h4><a href="#/legal/privacidade">Política de Privacidade</a>' +
          '<a href="#/legal/termos">Termos de Uso</a><a href="#/legal/dados">Origem dos dados</a>' +
          '<a href="#/legal/remocao">Remoção e opt-out</a></div>' +
        '<div><h4>Conta</h4><a href="#/entrar">Entrar</a><a href="#/criar-conta">Criar conta</a>' +
          '<a href="#/recuperar-senha">Esqueci minha senha</a></div>' +
      '</div>' +
      '<div class="lp-foot-bot"><span>© ' + new Date().getFullYear() + ' SiteHunter AI — nome provisório do produto.</span>' +
      '<span>Dados de demonstração fictícios. Nenhuma empresa real é representada.</span></div>' +
      '</footer>' +
      '</div>';

    var bt = root.querySelector('#lp-tema');
    bt.innerHTML = global.ico(global.Store.config().tema === 'dark' ? 'sun' : 'moon', 17);
    bt.addEventListener('click', function () {
      bt.innerHTML = global.ico(ui.alternarTema() === 'dark' ? 'sun' : 'moon', 17);
    });

    root.querySelectorAll('a[href^="#recursos"],a[href^="#fluxo"],a[href^="#planos"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var el = root.querySelector(a.getAttribute('href'));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };

  function marca(claro) {
    return '<span class="brand-mark">' + global.ico('radar', 19) + '</span>' +
      '<span class="brand-name"' + (claro ? ' style="color:#fff"' : '') + '>SiteHunter<span>Prospecção digital</span></span>';
  }

  function mockup(semSite) {
    var ui = U();
    var top = global.Store.empresas().slice().sort(function (a, b) { return b.score - a.score; }).slice(0, 4);
    return '<div class="mock">' +
      '<div class="mock-bar">' +
        '<span class="mock-dot" style="background:#f87171"></span>' +
        '<span class="mock-dot" style="background:#fbbf24"></span>' +
        '<span class="mock-dot" style="background:#34d399"></span>' +
        '<span style="margin-left:10px;font-size:11.5px;color:var(--text-muted);font-weight:600">Radar de Empresas</span>' +
      '</div>' +
      '<div class="mock-body">' +
        '<div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">' +
          '<span class="badge badge-emerald badge-dot">' + semSite + ' sem site</span>' +
          '<span class="badge badge-gray">Situação: Ativa</span>' +
          '<span class="badge badge-gray">Score ≥ 70</span>' +
        '</div>' +
        top.map(function (c) {
          return '<div class="mock-line">' + ui.logoEmpresa(c.nome) +
            '<div style="flex:1;min-width:0"><div class="co-name truncate">' + ui.esc(c.nome) + '</div>' +
            '<div class="co-sub truncate">' + ui.esc(c.cidade) + '/' + ui.esc(c.uf) + ' · ' + ui.esc(c.segmento) + '</div></div>' +
            ui.scoreCelula(c.score) + '</div>';
        }).join('') +
      '</div></div>';
  }
})(window);
