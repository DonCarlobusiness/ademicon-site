/* SiteHunter AI — Top Oportunidades */
(function (global) {
  'use strict';
  global.Views = global.Views || {};

  var filtro = { uf: '', segmento: '', semSiteApenas: true };

  global.Views.oportunidades = function (page) {
    var ui = global.UI;

    var lista = global.Store.empresas().filter(function (c) {
      if (filtro.semSiteApenas && c.website) return false;
      if (filtro.uf && c.uf !== filtro.uf) return false;
      if (filtro.segmento && c.segmento !== filtro.segmento) return false;
      return true;
    }).sort(function (a, b) { return b.score - a.score || b.valorPotencial - a.valorPotencial; });

    var top = lista.slice(0, 25);
    var dez = lista.slice(0, 10);
    var semDemo = dez.filter(function (c) { return !global.Store.demoDaEmpresa(c.id); });
    var potencial10 = dez.reduce(function (s, c) { return s + c.valorPotencial; }, 0);

    var ufs = {};
    global.Store.empresas().forEach(function (c) { ufs[c.uf] = true; });

    page.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">Top Oportunidades</h1>' +
        '<p class="page-sub">Ranking das empresas com maior score de oportunidade. ' +
        'Comece pelo topo: são as que mais têm a ganhar com um site.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-primary" id="demos10" ' + (semDemo.length ? '' : 'disabled') + '>' +
            global.ico('bolt', 16) + ' CRIAR DEMOS PARA AS 10 MELHORES</button>' +
        '</div>' +
      '</div>' +

      '<div class="grid g-kpi">' +
        kpi('Oportunidades no ranking', ui.num(lista.length), 'trophy', 'emerald',
            filtro.semSiteApenas ? 'Apenas empresas sem site' : 'Todas as empresas') +
        kpi('Score médio do Top 10', dez.length ? Math.round(dez.reduce(function (s, c) { return s + c.score; }, 0) / dez.length) : '—',
            'target', 'sky', 'Máximo possível: 100') +
        kpi('Potencial do Top 10', ui.brl(potencial10), 'money', 'emerald', 'Soma do valor estimado') +
        kpi('Sem demonstração', ui.num(semDemo.length) + ' de ' + dez.length, 'layout', 'amber',
            semDemo.length ? 'Prontas para gerar' : 'Todas já têm demonstração') +
      '</div>' +

      '<div class="card section-gap"><div class="card-head">' +
        '<div><div class="card-title">Ranking de oportunidades</div>' +
        '<div class="card-sub">Ordenado por score e, em caso de empate, por valor potencial</div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<select class="select" id="op-uf" style="width:auto;min-width:130px">' +
            '<option value="">Todos os estados</option>' +
            Object.keys(ufs).sort().map(function (u) {
              return '<option value="' + u + '"' + (filtro.uf === u ? ' selected' : '') + '>' + u + '</option>';
            }).join('') + '</select>' +
          '<select class="select" id="op-seg" style="width:auto;min-width:160px">' +
            '<option value="">Todos os segmentos</option>' +
            global.Dados.segmentos.slice().sort().map(function (s) {
              return '<option value="' + ui.esc(s) + '"' + (filtro.segmento === s ? ' selected' : '') + '>' + ui.esc(s) + '</option>';
            }).join('') + '</select>' +
          '<button class="chip ' + (filtro.semSiteApenas ? 'active' : '') + '" id="op-semsite">' +
            global.ico('globeOff', 14) + ' Só sem site</button>' +
        '</div>' +
      '</div>' +
      (top.length ? top.map(linhaRanking).join('')
        : ui.vazio('search', 'Nenhuma oportunidade com esses filtros',
            'Remova o filtro de estado ou segmento, ou inclua também empresas que já possuem site.')) +
      '</div>';

    page.querySelector('#op-uf').addEventListener('change', function (e) {
      filtro.uf = e.target.value; global.App.recarregar();
    });
    page.querySelector('#op-seg').addEventListener('change', function (e) {
      filtro.segmento = e.target.value; global.App.recarregar();
    });
    page.querySelector('#op-semsite').addEventListener('click', function () {
      filtro.semSiteApenas = !filtro.semSiteApenas; global.App.recarregar();
    });

    ui.aoClicar(page, '[data-crm]', function (b) {
      if (b.disabled) return;
      global.Acoes.adicionarAoCrm(b.dataset.crm, function () { global.App.recarregar(); });
    });
    ui.aoClicar(page, '[data-demo]', function (b) {
      global.Acoes.criarDemo(b.dataset.demo, function () { global.App.recarregar(); });
    });
    ui.aoClicar(page, '[data-msg]', function (b) { global.Acoes.gerarAbordagem(b.dataset.msg); });

    var b10 = page.querySelector('#demos10');
    if (b10 && !b10.disabled) {
      b10.addEventListener('click', function () { criarDemosEmLote(semDemo); });
    }
  };

  function linhaRanking(c, i) {
    var ui = global.UI;
    var f = global.Score.faixa(c.score);
    var pos = i + 1;
    var medalha = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '';
    var temDemo = !!global.Store.demoDaEmpresa(c.id);
    var noCrm = !!global.Store.leadDaEmpresa(c.id);

    return '<div class="rank-row ' + (pos <= 3 ? 'top' + pos : '') + '">' +
      '<span class="rank-pos">' + (medalha ? '<span class="rank-medal">' + medalha + '</span>' : '#' + pos) + '</span>' +
      ui.logoEmpresa(c.nome) +
      '<div style="flex:1;min-width:0">' +
        '<a href="#/app/empresa/' + c.id + '" class="co-name truncate" style="display:block">' + ui.esc(c.nome) + '</a>' +
        '<div class="co-sub truncate">' + ui.esc(c.segmento) + ' · ' + ui.esc(c.cidade) + '/' + ui.esc(c.uf) +
        (c.website ? '' : ' · sem site') + (temDemo ? ' · demonstração criada' : '') + '</div>' +
      '</div>' +
      '<div class="desktop-only" style="width:120px">' + ui.pilulasPresenca(c) + '</div>' +
      '<div class="desktop-only mono" style="width:96px;text-align:right;font-weight:650;font-size:13px">' +
        ui.brl(c.valorPotencial) + '</div>' +
      '<div style="width:104px">' + ui.scoreCelula(c.score) + '</div>' +
      '<span class="badge ' + f.badge + ' desktop-only">' + ui.esc(f.curto) + '</span>' +
      '<div class="row-actions">' +
        '<button class="btn btn-ghost btn-sm" data-msg="' + c.id + '" title="Gerar abordagem">' + global.ico('sparkles', 14) + '</button>' +
        '<button class="btn btn-ghost btn-sm" data-demo="' + c.id + '" title="' +
          (temDemo ? 'Ver demonstração' : 'Criar demonstração') + '">' + global.ico('layout', 14) + '</button>' +
        '<button class="btn ' + (noCrm ? 'btn-ghost' : 'btn-soft') + ' btn-sm" data-crm="' + c.id + '" ' +
          (noCrm ? 'disabled' : '') + ' title="' + (noCrm ? 'Já está no CRM' : 'Adicionar ao CRM') + '">' +
          global.ico(noCrm ? 'check' : 'plus', 14) + '</button>' +
      '</div>' +
    '</div>';
  }

  function kpi(rotulo, valor, icone, cor, rodape) {
    var cores = { emerald: ['var(--accent-soft)', 'var(--accent-hover)'], sky: ['var(--sky-soft)', 'var(--sky)'],
                  amber: ['var(--amber-soft)', 'var(--amber)'] }[cor];
    return '<div class="kpi"><div class="kpi-top"><span class="kpi-label">' + global.UI.esc(rotulo) + '</span>' +
      '<span class="kpi-ico" style="background:' + cores[0] + ';color:' + cores[1] + '">' + global.ico(icone, 16) + '</span></div>' +
      '<div class="kpi-value">' + valor + '</div><div class="kpi-foot">' + global.UI.esc(rodape) + '</div></div>';
  }

  /* ---------- Geração em lote ---------- */
  function criarDemosEmLote(empresas) {
    var ui = global.UI;
    if (!empresas.length) { ui.toast('Todas as 10 melhores já possuem demonstração.', 'info'); return; }

    ui.modal({
      titulo: 'Criar demonstrações em lote',
      subtitulo: empresas.length + ' empresa(s) sem demonstração no Top 10',
      corpo:
        '<p style="font-size:13.5px;color:var(--text-soft);line-height:1.65;margin-bottom:16px">' +
        'Será gerada uma demonstração para cada empresa abaixo, usando apenas os dados já cadastrados. ' +
        'Empresas que já possuem demonstração são ignoradas.</p>' +
        '<div id="lote-lista" style="display:flex;flex-direction:column;gap:2px;max-height:290px;overflow-y:auto">' +
          empresas.map(function (c, i) {
            return '<div class="audit-row" data-lote="' + c.id + '">' +
              '<div class="audit-k">' + ui.logoEmpresa(c.nome) +
              '<span style="min-width:0"><span class="co-name truncate" style="display:block">' + ui.esc(c.nome) + '</span>' +
              '<span class="co-sub">' + ui.esc(c.cidade) + '/' + ui.esc(c.uf) + ' · score ' + c.score + '</span></span></div>' +
              '<span class="badge badge-gray" data-status="' + c.id + '">Na fila</span></div>';
          }).join('') +
        '</div>' +
        '<div style="margin-top:18px"><div class="progress"><i id="lote-bar" style="width:0%"></i></div>' +
        '<p class="hint" style="margin-top:9px" id="lote-msg">Aguardando início…</p></div>',
      rodape: '<button class="btn btn-ghost" data-fechar id="lote-cancelar">Cancelar</button>' +
              '<button class="btn btn-primary" id="lote-go">' + global.ico('bolt', 16) + ' Gerar ' + empresas.length + ' demonstrações</button>',
      aoAbrir: function (m) {
        m.querySelector('#lote-go').addEventListener('click', function () {
          var bt = m.querySelector('#lote-go');
          bt.disabled = true;
          bt.innerHTML = '<span class="spinner"></span> Gerando…';
          m.querySelector('#lote-cancelar').disabled = true;

          var i = 0;
          (function proxima() {
            if (i >= empresas.length) {
              m.querySelector('#lote-msg').textContent = empresas.length + ' demonstrações criadas com sucesso.';
              bt.innerHTML = global.ico('check', 16) + ' Concluído';
              m.querySelector('#lote-cancelar').disabled = false;
              m.querySelector('#lote-cancelar').textContent = 'Fechar';
              setTimeout(function () {
                ui.fecharModal();
                ui.toast(empresas.length + ' demonstrações criadas. Veja em Sites Demo.');
                global.Router.ir('/app/demos');
              }, 900);
              return;
            }
            var c = empresas[i];
            var tag = m.querySelector('[data-status="' + c.id + '"]');
            tag.className = 'badge badge-amber';
            tag.textContent = 'Gerando…';
            m.querySelector('#lote-msg').textContent = 'Gerando demonstração de ' + c.nome + '…';

            setTimeout(function () {
              global.Store.criarDemo(c.id, 'institucional');
              tag.className = 'badge badge-emerald badge-dot';
              tag.textContent = 'Pronta';
              i++;
              m.querySelector('#lote-bar').style.width = (i / empresas.length * 100) + '%';
              proxima();
            }, 420);
          })();
        });
      }
    });
  }
})(window);
