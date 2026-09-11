/* SiteHunter AI — Painel Financeiro */
(function (global) {
  'use strict';
  global.Views = global.Views || {};

  global.Views.financeiro = function (page) {
    var ui = global.UI;
    var m = global.Metricas();

    var etapas = [
      { r: 'Encontrados',  v: m.empresas,      cor: '#334155' },
      { r: 'Qualificados', v: m.qualificados,  cor: '#0284c7' },
      { r: 'Contatados',   v: m.contatados,    cor: '#7c3aed' },
      { r: 'Responderam',  v: m.responderam,   cor: '#d97706' },
      { r: 'Propostas',    v: m.comProposta,   cor: '#4f46e5' },
      { r: 'Fechados',     v: m.fechados,      cor: '#059669' }
    ];
    var base = etapas[0].v || 1;

    page.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">Painel Financeiro</h1>' +
        '<p class="page-sub">Desempenho da sua operação, do lead encontrado à receita fechada.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-ghost" id="fin-export">' + global.ico('download', 16) + ' Exportar resumo</button>' +
        '</div>' +
      '</div>' +

      '<div class="grid g-kpi">' +
        kpi('Leads encontrados', ui.num(m.empresas), 'building', 'sky', m.semSite + ' sem site') +
        kpi('Leads abordados', ui.num(m.contatados), 'send', 'violet', m.demosEnviadas + ' com demonstração enviada') +
        kpi('Taxa de resposta', ui.pct(m.taxaResposta), 'inbox', 'amber', m.responderam + ' responderam') +
        kpi('Demos enviadas', ui.num(m.demosEnviadas), 'layout', 'violet', m.demos + ' criadas no total') +
        kpi('Propostas', ui.num(m.propostasEnviadas), 'doc', 'sky', ui.brl(m.receitaEmNegociacao) + ' em aberto') +
        kpi('Conversão', ui.pct(m.taxaConversao), 'target', 'emerald', m.fechados + ' clientes fechados') +
        kpi('Ticket médio', ui.brl(m.ticketMedio), 'money', 'emerald', 'Por venda concluída') +
        kpi('Receita potencial', ui.brl(m.faturamentoPotencial), 'chart', 'amber', 'Pipeline em aberto') +
        kpi('Receita fechada', ui.brl(m.receitaFechada), 'trophy', 'emerald', 'Propostas aceitas') +
      '</div>' +

      '<div class="grid section-gap" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)">' +
        '<div class="card"><div class="card-head"><div>' +
          '<div class="card-title">Funil de conversão</div>' +
          '<div class="card-sub">Percentual sobre o total de empresas encontradas</div></div></div>' +
          '<div class="card-pad"><div class="funnel">' +
            etapas.map(function (e, i) {
              var p = (e.v / base) * 100;
              var anterior = i > 0 ? etapas[i - 1].v : null;
              var conv = anterior ? (anterior ? (e.v / anterior) * 100 : 0) : null;
              return '<div class="funnel-row">' +
                '<span class="funnel-label">' + ui.esc(e.r) + '</span>' +
                '<span class="funnel-bar"><i style="width:' + Math.max(p, e.v ? 10 : 0) + '%;background:' + e.cor + '">' +
                  (e.v || '') + '</i></span>' +
                '<span class="funnel-pct">' + ui.pct(p, 0) +
                (conv !== null ? '<small>' + ui.pct(conv, 0) + ' da anterior</small>' : '') +
                '</span></div>';
            }).join('') +
          '</div>' +
          '<p class="hint" style="margin-top:16px">' + global.ico('info', 13) +
          ' Um lead só é contado em uma etapa quando efetivamente a alcançou no CRM. ' +
          'Leads perdidos mantêm as etapas que já haviam registrado.</p>' +
        '</div></div>' +

        '<div style="display:flex;flex-direction:column;gap:16px">' +
          '<div class="card"><div class="card-head"><div class="card-title">Receita</div></div>' +
          '<div class="card-pad">' +
            barraReceita('Fechada', m.receitaFechada, 'var(--emerald-600)', m.receitaFechada + m.receitaEmNegociacao + m.faturamentoPotencial) +
            barraReceita('Em negociação', m.receitaEmNegociacao, 'var(--amber)', m.receitaFechada + m.receitaEmNegociacao + m.faturamentoPotencial) +
            barraReceita('Potencial no pipeline', m.faturamentoPotencial, 'var(--sky)', m.receitaFechada + m.receitaEmNegociacao + m.faturamentoPotencial) +
            '<div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border);' +
            'display:flex;justify-content:space-between;align-items:baseline">' +
            '<span class="label">Total mapeado</span>' +
            '<span class="kpi-value" style="font-size:21px">' +
            ui.brl(m.receitaFechada + m.receitaEmNegociacao + m.faturamentoPotencial) + '</span></div>' +
          '</div></div>' +

          '<div class="card"><div class="card-head"><div class="card-title">Indicadores de eficiência</div></div>' +
          '<div class="card-pad">' +
            indicador('Empresas por lead no CRM', m.leads ? (m.empresas / m.leads).toFixed(1).replace('.', ',') : '—',
              'Quantas empresas você analisa para gerar um lead') +
            indicador('Abordagens por resposta', m.responderam ? (m.contatados / m.responderam).toFixed(1).replace('.', ',') : '—',
              'Quantos contatos até obter um retorno') +
            indicador('Propostas por venda', m.fechados ? (m.propostasEnviadas / m.fechados).toFixed(1).replace('.', ',') : '—',
              'Quantas propostas até fechar um cliente') +
            indicador('Leads perdidos', ui.num(m.perdidos),
              'Negociações encerradas sem venda') +
          '</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="card section-gap"><div class="card-head"><div>' +
        '<div class="card-title">Potencial por segmento</div>' +
        '<div class="card-sub">Soma do valor potencial das empresas da base, por segmento</div></div></div>' +
        '<div class="card-pad">' + porSegmento() + '</div>' +
      '</div>';

    page.querySelector('#fin-export').addEventListener('click', function () {
      var linhas = [
        ['indicador', 'valor'],
        ['Leads encontrados', m.empresas],
        ['Leads qualificados', m.qualificados],
        ['Leads abordados', m.contatados],
        ['Responderam', m.responderam],
        ['Taxa de resposta (%)', m.taxaResposta.toFixed(1)],
        ['Demonstracoes criadas', m.demos],
        ['Demonstracoes enviadas', m.demosEnviadas],
        ['Propostas enviadas', m.propostasEnviadas],
        ['Clientes fechados', m.fechados],
        ['Conversao (%)', m.taxaConversao.toFixed(1)],
        ['Ticket medio (R$)', Math.round(m.ticketMedio)],
        ['Receita fechada (R$)', m.receitaFechada],
        ['Receita em negociacao (R$)', m.receitaEmNegociacao],
        ['Receita potencial (R$)', m.faturamentoPotencial]
      ];
      var csv = '﻿' + linhas.map(function (l) { return l.join(';'); }).join('\n');
      global.App.baixar('sitehunter-financeiro.csv', csv, 'text/csv;charset=utf-8');
      global.UI.toast('Resumo financeiro exportado.');
    });
  };

  function kpi(rotulo, valor, icone, cor, rodape) {
    var cores = { emerald: ['var(--accent-soft)', 'var(--accent-hover)'], sky: ['var(--sky-soft)', 'var(--sky)'],
                  violet: ['var(--violet-soft)', 'var(--violet)'], amber: ['var(--amber-soft)', 'var(--amber)'] }[cor];
    return '<div class="kpi"><div class="kpi-top"><span class="kpi-label">' + global.UI.esc(rotulo) + '</span>' +
      '<span class="kpi-ico" style="background:' + cores[0] + ';color:' + cores[1] + '">' + global.ico(icone, 16) + '</span></div>' +
      '<div class="kpi-value">' + valor + '</div>' +
      (rodape ? '<div class="kpi-foot">' + global.UI.esc(rodape) + '</div>' : '') + '</div>';
  }

  function barraReceita(rotulo, valor, cor, total) {
    var ui = global.UI;
    var p = total ? (valor / total) * 100 : 0;
    return '<div style="margin-bottom:15px">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px">' +
      '<span style="font-size:12.5px;font-weight:600;color:var(--text-soft)">' + ui.esc(rotulo) + '</span>' +
      '<span class="mono" style="font-size:13px;font-weight:750">' + ui.brl(valor) + '</span></div>' +
      '<div class="progress"><i style="width:' + p + '%;background:' + cor + '"></i></div></div>';
  }

  function indicador(rotulo, valor, ajuda) {
    var ui = global.UI;
    return '<div class="audit-row">' +
      '<div style="min-width:0"><div style="font-size:13px;font-weight:600">' + ui.esc(rotulo) + '</div>' +
      '<div class="hint" style="margin-top:2px">' + ui.esc(ajuda) + '</div></div>' +
      '<span class="mono" style="font-size:17px;font-weight:800;font-family:var(--font-display)">' + valor + '</span></div>';
  }

  function porSegmento() {
    var ui = global.UI;
    var mapa = {};
    global.Store.empresas().forEach(function (c) {
      if (!mapa[c.segmento]) mapa[c.segmento] = { n: 0, valor: 0, semSite: 0 };
      mapa[c.segmento].n++;
      mapa[c.segmento].valor += c.valorPotencial;
      if (!c.website) mapa[c.segmento].semSite++;
    });
    var lista = Object.keys(mapa).map(function (k) {
      return { seg: k, n: mapa[k].n, valor: mapa[k].valor, semSite: mapa[k].semSite };
    }).sort(function (a, b) { return b.valor - a.valor; });
    var max = lista.length ? lista[0].valor : 1;

    return '<div class="table-wrap"><table class="tbl" style="min-width:560px"><thead><tr>' +
      '<th>Segmento</th><th>Empresas</th><th>Sem site</th><th>Potencial</th><th style="width:38%">Participação</th>' +
      '</tr></thead><tbody>' + lista.map(function (x) {
        return '<tr><td style="font-weight:600">' + ui.esc(x.seg) + '</td>' +
          '<td class="mono soft">' + x.n + '</td>' +
          '<td class="mono soft">' + x.semSite + '</td>' +
          '<td class="mono" style="font-weight:700">' + ui.brl(x.valor) + '</td>' +
          '<td><div class="progress"><i style="width:' + ((x.valor / max) * 100) + '%"></i></div></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
})(window);
