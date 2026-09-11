/* SiteHunter AI — Visão Geral */
(function (global) {
  'use strict';
  global.Views = global.Views || {};

  /* Métricas compartilhadas entre a Visão Geral e o Painel Financeiro */
  function metricas() {
    var empresas = global.Store.empresas();
    var leads = global.Store.leads();
    var demos = global.Store.demos();
    var propostas = global.Store.propostas();

    var ordem = ['novo', 'analisado', 'demo', 'contatado', 'respondeu', 'reuniao', 'proposta', 'fechado'];
    function alcancou(lead, estagio) {
      if (lead.estagio === 'perdido') {
        /* Um lead perdido passou por tudo que estava antes do momento da perda.
           Sem histórico completo, contamos apenas os eventos registrados. */
        var eventos = global.Store.eventos(lead.company_id);
        return eventos.some(function (e) { return e.para === estagio; });
      }
      return ordem.indexOf(lead.estagio) >= ordem.indexOf(estagio);
    }

    var contatados = leads.filter(function (l) { return alcancou(l, 'contatado'); }).length;
    var responderam = leads.filter(function (l) { return alcancou(l, 'respondeu'); }).length;
    var qualificados = leads.filter(function (l) { return alcancou(l, 'analisado'); }).length;
    var comProposta = leads.filter(function (l) { return alcancou(l, 'proposta'); }).length;
    var fechados = leads.filter(function (l) { return l.estagio === 'fechado'; }).length;
    var perdidos = leads.filter(function (l) { return l.estagio === 'perdido'; }).length;

    var propostasEnviadas = propostas.filter(function (p) { return p.status !== 'rascunho'; });
    var propostasAceitas = propostas.filter(function (p) { return p.status === 'aceita'; });
    var receitaFechada = propostasAceitas.reduce(function (s, p) { return s + (p.valor || 0); }, 0);
    var receitaEmNegociacao = propostas.filter(function (p) { return p.status === 'enviada'; })
      .reduce(function (s, p) { return s + (p.valor || 0); }, 0);

    var faturamentoPotencial = leads
      .filter(function (l) { return ['perdido', 'fechado'].indexOf(l.estagio) === -1; })
      .reduce(function (s, l) { return s + (l.valor_potencial || 0); }, 0);

    var potencialBase = empresas.reduce(function (s, c) { return s + (c.valorPotencial || 0); }, 0);

    return {
      empresas: empresas.length,
      semSite: empresas.filter(function (c) { return !c.website; }).length,
      siteFraco: empresas.filter(function (c) { return c.website && c.siteFraco; }).length,
      altaOportunidade: empresas.filter(function (c) { return c.score >= 75; }).length,
      leads: leads.length,
      qualificados: qualificados,
      contatados: contatados,
      responderam: responderam,
      demos: demos.length,
      demosEnviadas: demos.filter(function (d) { return d.enviada_em; }).length,
      propostas: propostas.length,
      propostasEnviadas: propostasEnviadas.length,
      comProposta: comProposta,
      fechados: fechados,
      perdidos: perdidos,
      receitaFechada: receitaFechada,
      receitaEmNegociacao: receitaEmNegociacao,
      faturamentoPotencial: faturamentoPotencial,
      potencialBase: potencialBase,
      taxaResposta: contatados ? (responderam / contatados) * 100 : 0,
      taxaConversao: contatados ? (fechados / contatados) * 100 : 0,
      ticketMedio: propostasAceitas.length ? receitaFechada / propostasAceitas.length : 0
    };
  }
  global.Metricas = metricas;

  /* Série de oportunidades encontradas por dia, últimos 30 dias */
  function serie30dias() {
    var mapa = {};
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var i, d, chave;
    for (i = 29; i >= 0; i--) {
      d = new Date(hoje.getTime() - i * 864e5);
      chave = d.toISOString().slice(0, 10);
      mapa[chave] = { chave: chave, data: d, valor: 0 };
    }
    global.Store.empresas().forEach(function (c) {
      if (!c.descoberto_em) return;
      var k = c.descoberto_em.slice(0, 10);
      if (mapa[k]) mapa[k].valor++;
    });
    return Object.keys(mapa).sort().map(function (k) {
      var it = mapa[k];
      return {
        rotulo: it.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        rotuloCurto: it.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        valor: it.valor
      };
    });
  }

  var FLUXO = [
    { i: 'radar', t: 'Encontrar', r: '/app/radar' },
    { i: 'globeOff', t: 'Analisar', r: '/app/radar' },
    { i: 'target', t: 'Score', r: '/app/oportunidades' },
    { i: 'layout', t: 'Site demo', r: '/app/demos' },
    { i: 'sparkles', t: 'Abordagem', r: '/app/crm' },
    { i: 'send', t: 'Enviar', r: '/app/crm' },
    { i: 'doc', t: 'Proposta', r: '/app/propostas' },
    { i: 'handshake', t: 'Fechar', r: '/app/financeiro' }
  ];

  global.Views.visaoGeral = function (page) {
    var ui = global.UI;
    var m = metricas();
    var u = global.Store.usuario();
    var serie = serie30dias();
    var total30 = serie.reduce(function (s, d) { return s + d.valor; }, 0);

    var melhores = global.Store.empresas()
      .filter(function (c) { return !global.Store.leadDaEmpresa(c.id); })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 5);

    var kpis = [
      { r: 'Empresas encontradas', v: ui.num(m.empresas), i: 'building', c: 'sky',
        f: m.altaOportunidade + ' com score 75 ou mais' },
      { r: 'Oportunidades sem site', v: ui.num(m.semSite), i: 'globeOff', c: 'emerald',
        f: m.siteFraco + ' com site fraco' },
      { r: 'Contatadas', v: ui.num(m.contatados), i: 'send', c: 'violet',
        f: m.demosEnviadas + ' demonstrações enviadas' },
      { r: 'Respostas', v: ui.num(m.responderam), i: 'inbox', c: 'amber',
        f: ui.pct(m.taxaResposta) + ' de taxa de resposta' },
      { r: 'Propostas enviadas', v: ui.num(m.propostasEnviadas), i: 'doc', c: 'sky',
        f: ui.brl(m.receitaEmNegociacao) + ' em negociação' },
      { r: 'Clientes fechados', v: ui.num(m.fechados), i: 'handshake', c: 'emerald',
        f: ui.pct(m.taxaConversao) + ' de conversão' },
      { r: 'Faturamento potencial', v: ui.brl(m.faturamentoPotencial), i: 'money', c: 'emerald',
        f: ui.brl(m.receitaFechada) + ' já fechados' }
    ];

    page.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">Olá, ' + ui.esc((u && u.nome.split(' ')[0]) || 'consultor') + ' 👋</h1>' +
        '<p class="page-sub">Resumo da sua operação de prospecção. Os números refletem os dados ' +
        'gravados neste navegador.</p></div>' +
        '<div class="page-actions">' +
          '<a href="#/app/oportunidades" class="btn btn-ghost">' + global.ico('trophy', 16) + ' Top oportunidades</a>' +
          '<a href="#/app/radar" class="btn btn-primary">' + global.ico('radar', 16) + ' Buscar empresas</a>' +
        '</div>' +
      '</div>' +

      '<div class="grid g-kpi">' + kpis.map(cardKpi).join('') + '</div>' +

      '<div class="card section-gap">' +
        '<div class="card-head"><div><div class="card-title">Fluxo de trabalho</div>' +
        '<div class="card-sub">Cada etapa leva à tela correspondente</div></div></div>' +
        '<div class="card-pad"><div class="flow">' + FLUXO.map(function (f, i) {
          return '<div class="flow-step"><a class="flow-box" href="#' + f.r + '">' +
            '<span class="flow-ico">' + global.ico(f.i, 17) + '</span>' +
            '<span class="flow-n">ETAPA ' + (i + 1) + '</span>' +
            '<span class="flow-t">' + ui.esc(f.t) + '</span></a>' +
            (i < FLUXO.length - 1 ? '<span class="flow-arrow">' + global.ico('chevronRight', 16) + '</span>' : '') +
            '</div>';
        }).join('') + '</div></div>' +
      '</div>' +

      '<div class="grid section-gap" style="grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)">' +
        '<div class="card">' +
          '<div class="card-head">' +
            '<div><div class="card-title">Oportunidades encontradas nos últimos 30 dias</div>' +
            '<div class="card-sub">' + total30 + ' empresas adicionadas à base no período</div></div>' +
            '<span class="chart-legend"><span><span class="lg-dot" style="background:var(--emerald-500)"></span>' +
            'Empresas encontradas</span></span>' +
          '</div>' +
          '<div class="card-pad" id="grafico">' + ui.graficoBarras(serie, { sufixo: 'empresas' }) + '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-head"><div><div class="card-title">Distribuição por faixa de score</div>' +
          '<div class="card-sub">Base completa</div></div></div>' +
          '<div class="card-pad">' + distribuicaoScore() + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card section-gap">' +
        '<div class="card-head">' +
          '<div><div class="card-title">Melhores oportunidades de hoje</div>' +
          '<div class="card-sub">Empresas de maior score que ainda não entraram no seu CRM</div></div>' +
          '<a href="#/app/oportunidades" class="btn btn-ghost btn-sm">Ver ranking completo ' + global.ico('arrowRight', 14) + '</a>' +
        '</div>' +
        (melhores.length
          ? '<div class="table-wrap"><table class="tbl"><thead><tr>' +
            '<th>Empresa</th><th>Cidade/UF</th><th>Segmento</th><th>Presença</th><th>Score</th><th>Potencial</th><th></th>' +
            '</tr></thead><tbody>' + melhores.map(function (c) {
              return '<tr>' +
                '<td><a class="cell-company" href="#/app/empresa/' + c.id + '">' + ui.logoEmpresa(c.nome) +
                  '<span><span class="co-name">' + ui.esc(c.nome) + '</span>' +
                  '<span class="co-sub">' + (c.website ? ui.esc(c.website) : 'Sem site próprio') + '</span></span></a></td>' +
                '<td class="soft">' + ui.esc(c.cidade) + '/' + ui.esc(c.uf) + '</td>' +
                '<td class="soft">' + ui.esc(c.segmento) + '</td>' +
                '<td>' + ui.pilulasPresenca(c) + '</td>' +
                '<td>' + ui.scoreCelula(c.score) + '</td>' +
                '<td class="mono" style="font-weight:650">' + ui.brl(c.valorPotencial) + '</td>' +
                '<td><div class="row-actions">' +
                  '<button class="btn btn-soft btn-sm" data-crm="' + c.id + '">' + global.ico('plus', 14) + ' CRM</button>' +
                  '<a class="btn btn-ghost btn-sm" href="#/app/empresa/' + c.id + '">Abrir</a>' +
                '</div></td></tr>';
            }).join('') + '</tbody></table></div>'
          : ui.vazio('checkCircle', 'Todas as melhores já estão no CRM',
              'Cada empresa de alto score da base já virou lead. Use o Radar para ampliar sua base ou importe novos leads.',
              '<a href="#/app/importar" class="btn btn-primary btn-sm">Importar leads</a>')) +
      '</div>';

    ui.ativarTooltipGrafico(page.querySelector('#grafico'));

    ui.aoClicar(page, '[data-crm]', function (b) {
      var r = global.Store.criarLead(b.dataset.crm, 'novo');
      if (!r.ok) { ui.toast(r.erro, 'err'); return; }
      ui.toast('Empresa adicionada ao CRM em NOVO LEAD.');
      global.App.recarregar();
    });
  };

  function cardKpi(k) {
    var cores = {
      emerald: ['var(--accent-soft)', 'var(--accent-hover)'],
      sky: ['var(--sky-soft)', 'var(--sky)'],
      violet: ['var(--violet-soft)', 'var(--violet)'],
      amber: ['var(--amber-soft)', 'var(--amber)'],
      rose: ['var(--rose-soft)', 'var(--rose)']
    }[k.c];
    return '<div class="kpi"><div class="kpi-top"><span class="kpi-label">' + global.UI.esc(k.r) + '</span>' +
      '<span class="kpi-ico" style="background:' + cores[0] + ';color:' + cores[1] + '">' + global.ico(k.i, 16) + '</span></div>' +
      '<div class="kpi-value">' + k.v + '</div>' +
      '<div class="kpi-foot">' + global.UI.esc(k.f) + '</div></div>';
  }

  function distribuicaoScore() {
    var ui = global.UI;
    var faixas = [
      { r: '90–100 · Excepcional', min: 90, max: 100, cor: '#059669' },
      { r: '75–89 · Alta', min: 75, max: 89, cor: '#0d9488' },
      { r: '60–74 · Boa', min: 60, max: 74, cor: '#0284c7' },
      { r: '40–59 · Média', min: 40, max: 59, cor: '#d97706' },
      { r: '0–39 · Baixa', min: 0, max: 39, cor: '#94a3b8' }
    ];
    var empresas = global.Store.empresas();
    var total = empresas.length || 1;
    return '<div class="funnel">' + faixas.map(function (f) {
      var n = empresas.filter(function (c) { return c.score >= f.min && c.score <= f.max; }).length;
      var p = (n / total) * 100;
      return '<div class="funnel-row">' +
        '<span class="funnel-label">' + ui.esc(f.r.split(' · ')[1]) + '</span>' +
        '<span class="funnel-bar"><i style="width:' + Math.max(p, n ? 9 : 0) + '%;background:' + f.cor + '">' +
        (n || '') + '</i></span>' +
        '<span class="funnel-pct">' + ui.pct(p, 0) + '</span></div>';
    }).join('') + '</div>' +
    '<p class="hint" style="margin-top:14px">Faixas definidas pelo motor de score: 90–100 excepcional, ' +
    '75–89 alta, 60–74 boa, 40–59 média, 0–39 baixa.</p>';
  }
})(window);
