/* SiteHunter AI — Sites Demo */
(function (global) {
  'use strict';
  global.Views = global.Views || {};

  global.Views.demos = function (page) {
    var ui = global.UI;
    var demos = global.Store.demos().slice().sort(function (a, b) {
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    var enviadas = demos.filter(function (d) { return d.enviada_em; }).length;

    var candidatas = global.Store.empresas()
      .filter(function (c) { return !global.Store.demoDaEmpresa(c.id); })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, 6);

    page.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">Sites Demo</h1>' +
        '<p class="page-sub">Demonstrações geradas a partir dos dados de cada empresa. ' +
        'Toda página traz um selo indicando que é uma proposta visual, não o site oficial.</p></div>' +
        '<div class="page-actions">' +
          '<a href="#/app/oportunidades" class="btn btn-primary">' + global.ico('bolt', 16) + ' Criar demos em lote</a>' +
        '</div>' +
      '</div>' +

      '<div class="grid g-kpi">' +
        kpi('Demonstrações criadas', demos.length, 'layout', 'violet') +
        kpi('Enviadas ao cliente', enviadas, 'send', 'emerald') +
        kpi('Aguardando envio', demos.length - enviadas, 'clock', 'amber') +
      '</div>' +

      '<div class="card section-gap"><div class="card-head">' +
        '<div><div class="card-title">Suas demonstrações</div>' +
        '<div class="card-sub">Clique em visualizar para abrir a página gerada</div></div></div>' +
        (demos.length
          ? '<div class="card-pad"><div class="grid g-3">' + demos.map(cardDemo).join('') + '</div></div>'
          : ui.vazio('layout', 'Nenhuma demonstração criada',
              'Crie a primeira demonstração a partir de uma empresa do Radar ou use a criação em lote no Top Oportunidades.',
              '<a href="#/app/oportunidades" class="btn btn-primary btn-sm">Ver Top Oportunidades</a>')) +
      '</div>' +

      (candidatas.length
        ? '<div class="card section-gap"><div class="card-head">' +
          '<div><div class="card-title">Sugestões para a próxima demonstração</div>' +
          '<div class="card-sub">Maiores scores que ainda não têm demonstração</div></div></div>' +
          '<div>' + candidatas.map(function (c) {
            return '<div class="rank-row">' + ui.logoEmpresa(c.nome) +
              '<div style="flex:1;min-width:0">' +
                '<a href="#/app/empresa/' + c.id + '" class="co-name truncate" style="display:block">' + ui.esc(c.nome) + '</a>' +
                '<div class="co-sub truncate">' + ui.esc(c.segmento) + ' · ' + ui.esc(c.cidade) + '/' + ui.esc(c.uf) + '</div>' +
              '</div>' +
              '<div style="width:104px">' + ui.scoreCelula(c.score) + '</div>' +
              '<button class="btn btn-soft btn-sm" data-nova="' + c.id + '">' + global.ico('plus', 14) + ' Criar demo</button>' +
              '</div>';
          }).join('') + '</div></div>'
        : '');

    ui.aoClicar(page, '[data-nova]', function (b) {
      global.Acoes.criarDemo(b.dataset.nova, function () { global.App.recarregar(); });
    });
    ui.aoClicar(page, '[data-ver]', function (b) {
      var c = global.Store.empresa(b.dataset.ver);
      if (c) global.SiteDemo.abrir(c);
    });
    ui.aoClicar(page, '[data-previa]', function (b) {
      var d = demoPorId(b.dataset.previa);
      var c = d && global.Store.empresa(d.company_id);
      if (c) global.Router.ir('/demo/' + d.id + '/' + c.id);
    });
    ui.aoClicar(page, '[data-link]', function (b) {
      var d = demoPorId(b.dataset.link);
      var c = d && global.Store.empresa(d.company_id);
      if (c) ui.copiar(global.SiteDemo.urlPublica(d, c), 'Link da demonstração copiado.');
    });
    ui.aoClicar(page, '[data-enviar]', function (b) {
      var d = demoPorId(b.dataset.enviar);
      var c = d && global.Store.empresa(d.company_id);
      if (c) global.Acoes.enviarDemo(d, c);
    });
    ui.aoClicar(page, '[data-excluir]', function (b) {
      var d = demoPorId(b.dataset.excluir);
      var c = d && global.Store.empresa(d.company_id);
      ui.confirmar('Excluir demonstração',
        'A demonstração de ' + (c ? c.nome : 'esta empresa') + ' será removida. Você pode gerá-la novamente depois.',
        function () {
          global.Store.removerDemo(d.id);
          ui.toast('Demonstração excluída.', 'info');
          global.App.recarregar();
        }, 'Excluir', true);
    });
  };

  function demoPorId(id) {
    return global.Store.demos().filter(function (d) { return d.id === id; })[0];
  }

  function cardDemo(d) {
    var ui = global.UI;
    var c = global.Store.empresa(d.company_id);
    if (!c) return '';
    return '<div class="demo-card">' +
      '<div class="demo-thumb"><b>' + ui.esc(c.nome) + '</b></div>' +
      '<div class="card-pad">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px">' +
          '<span class="badge ' + (d.enviada_em ? 'badge-emerald' : 'badge-amber') + ' badge-dot">' +
            (d.enviada_em ? 'Enviada ' + ui.tempoRelativo(d.enviada_em) : 'Aguardando envio') + '</span>' +
          '<span class="co-sub">' + ui.data(d.created_at) + '</span>' +
        '</div>' +
        '<div class="co-sub" style="margin-bottom:13px">' + ui.esc(c.segmento) + ' · ' +
          ui.esc(c.cidade) + '/' + ui.esc(c.uf) + '</div>' +
        '<div class="co-card-actions">' +
          '<button class="btn btn-primary btn-sm" data-ver="' + c.id + '">' + global.ico('external', 14) + ' VISUALIZAR</button>' +
          '<button class="btn btn-ghost btn-sm" data-previa="' + d.id + '">' + global.ico('eye', 14) + ' PRÉVIA</button>' +
          '<button class="btn btn-ghost btn-sm" data-link="' + d.id + '">' + global.ico('copy', 14) + ' COPIAR LINK</button>' +
          '<button class="btn btn-ghost btn-sm" data-enviar="' + d.id + '">' + global.ico('send', 14) + ' ENVIAR</button>' +
          '<a class="btn btn-ghost btn-sm" href="#/app/empresa/' + c.id + '?aba=dados">' + global.ico('edit', 14) + ' EDITAR</a>' +
          '<button class="btn btn-ghost btn-sm" data-excluir="' + d.id + '">' + global.ico('trash', 14) + ' EXCLUIR</button>' +
        '</div>' +
      '</div></div>';
  }

  function kpi(rotulo, valor, icone, cor) {
    var cores = { violet: ['var(--violet-soft)', 'var(--violet)'], emerald: ['var(--accent-soft)', 'var(--accent-hover)'],
                  amber: ['var(--amber-soft)', 'var(--amber)'] }[cor];
    return '<div class="kpi"><div class="kpi-top"><span class="kpi-label">' + global.UI.esc(rotulo) + '</span>' +
      '<span class="kpi-ico" style="background:' + cores[0] + ';color:' + cores[1] + '">' + global.ico(icone, 16) + '</span></div>' +
      '<div class="kpi-value">' + valor + '</div></div>';
  }

  /* ---------------- Prévia dentro do aplicativo ---------------- */
  global.Views.verDemo = function (page, params) {
    var ui = global.UI;
    var c = global.Store.empresa(params.companyId);
    if (!c) {
      page.innerHTML = '<div class="card">' + ui.vazio('alert', 'Demonstração indisponível',
        'A empresa desta demonstração não está mais na base.',
        '<a href="#/app/demos" class="btn btn-primary btn-sm">Voltar para Sites Demo</a>') + '</div>';
      return;
    }
    var demo = global.Store.demos().filter(function (d) { return d.id === params.demoId; })[0];

    page.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">Prévia: ' + ui.esc(c.nome) + '</h1>' +
        '<p class="page-sub">Página de demonstração gerada com os dados cadastrados. ' +
        'Os depoimentos são exemplos claramente identificados e as lacunas aparecem como campos a preencher.</p></div>' +
        '<div class="page-actions">' +
          '<a href="#/app/demos" class="btn btn-ghost">' + global.ico('arrowLeft', 16) + ' Voltar</a>' +
          '<button class="btn btn-ghost" id="pv-abrir">' + global.ico('external', 16) + ' Abrir em nova aba</button>' +
          (demo ? '<button class="btn btn-primary" id="pv-enviar">' + global.ico('send', 16) + ' Enviar para cliente</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="card"><div class="card-pad">' +
        '<iframe class="demo-frame" id="pv-frame" title="Prévia do site demonstração de ' + ui.esc(c.nome) + '" ' +
        'sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"></iframe>' +
      '</div></div>';

    /* allow-scripts sem allow-same-origin: a prévia roda em origem opaca, então o
       formulário de demonstração funciona sem acesso algum ao aplicativo. */
    var frame = page.querySelector('#pv-frame');
    frame.srcdoc = global.SiteDemo.html(c);

    page.querySelector('#pv-abrir').addEventListener('click', function () { global.SiteDemo.abrir(c); });
    var be = page.querySelector('#pv-enviar');
    if (be) be.addEventListener('click', function () { global.Acoes.enviarDemo(demo, c); });
  };
})(window);
