/* SiteHunter AI — Radar de Empresas */
(function (global) {
  'use strict';
  global.Views = global.Views || {};

  var estado = {
    uf: '', cidade: '', segmento: '', cnae: '', nome: '',
    situacao: 'ATIVA', telefone: '', whatsapp: '', email: '',
    site: 'todos', scoreMin: 0,
    ordem: 'score', modo: null, buscou: false, resultados: []
  };

  /* No celular os resultados nascem como cards; no desktop, como tabela.
     A escolha explícita do usuário no seletor prevalece sobre o padrão. */
  function modoAtual() {
    if (estado.modo) return estado.modo;
    return global.innerWidth <= 860 ? 'cards' : 'tabela';
  }

  global.Views.radar = function (page, params, query) {
    var ui = global.UI;

    if (query && query.site) estado.site = query.site;
    if (query && query.score) estado.scoreMin = parseInt(query.score, 10) || 0;

    page.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">Radar de Empresas</h1>' +
        '<p class="page-sub">Filtre a base e isole quem ainda não tem site. Cada resultado traz o score ' +
        'de oportunidade e as ações para avançar na venda.</p></div>' +
        '<div class="page-actions">' +
          '<a href="#/app/importar" class="btn btn-ghost">' + global.ico('upload', 16) + ' Importar CSV</a>' +
        '</div>' +
      '</div>' +

      '<div class="card"><div class="card-head">' +
        '<div><div class="card-title">' + global.ico('filter', 15) + ' Filtros de busca</div>' +
        '<div class="card-sub">Origem atual: base de demonstração local. ' +
        '<a href="#/legal/dados" class="link">Ver origem dos dados</a></div></div>' +
        '<button class="btn btn-ghost btn-sm" id="limpar">' + global.ico('refresh', 14) + ' Limpar filtros</button>' +
      '</div>' +
      '<div class="card-pad">' + filtrosHtml() + '</div></div>' +

      '<div id="resultados" class="section-gap"></div>';

    ligarFiltros(page);
    if (estado.buscou) renderResultados(page); else renderInicial(page);
  };

  function filtrosHtml() {
    var ui = global.UI;
    var cidades = global.Dados.cidades();
    var segmentos = global.Dados.segmentos.slice().sort();

    function opts(lista, valorAtual, rotuloVazio, mapear) {
      return '<option value="">' + rotuloVazio + '</option>' + lista.map(function (x) {
        var o = mapear(x);
        return '<option value="' + ui.esc(o.v) + '"' + (o.v === valorAtual ? ' selected' : '') + '>' +
          ui.esc(o.r) + '</option>';
      }).join('');
    }

    return '<div class="filters">' +
      campo('Estado', '<select class="select" id="f-uf">' +
        opts(global.Dados.ufs, estado.uf, 'Todos os estados', function (u) { return { v: u.sigla, r: u.sigla + ' — ' + u.nome }; }) +
        '</select>') +

      campo('Cidade', '<select class="select" id="f-cidade">' +
        opts(cidades, estado.cidade, 'Todas as cidades', function (c) { return { v: c.cidade, r: c.cidade + '/' + c.uf }; }) +
        '</select>') +

      campo('Segmento', '<select class="select" id="f-segmento">' +
        opts(segmentos, estado.segmento, 'Todos os segmentos', function (s) { return { v: s, r: s }; }) +
        '</select>') +

      campo('CNAE', '<select class="select" id="f-cnae">' +
        opts(global.Dados.cnaes, estado.cnae, 'Todos os CNAEs', function (c) { return { v: c.cod, r: c.cod + ' — ' + c.desc }; }) +
        '</select>') +

      campo('Nome da empresa', '<input class="input" type="search" id="f-nome" placeholder="Ex.: clínica, auto, transportes" value="' +
        ui.esc(estado.nome) + '">') +

      campo('Situação cadastral', '<select class="select" id="f-situacao">' +
        '<option value="">Todas</option>' +
        '<option value="ATIVA"' + (estado.situacao === 'ATIVA' ? ' selected' : '') + '>Ativa</option>' +
        '</select>') +

      campo('Tem telefone', simNao('f-telefone', estado.telefone)) +
      campo('Tem WhatsApp', simNao('f-whatsapp', estado.whatsapp)) +
      campo('Tem e-mail', simNao('f-email', estado.email)) +

      campo('Tem site', '<select class="select" id="f-site">' +
        ['todos', 'sem', 'com', 'fraco'].map(function (v) {
          var r = { todos: 'Todos', sem: 'Sem site', com: 'Com site', fraco: 'Site fraco' }[v];
          return '<option value="' + v + '"' + (estado.site === v ? ' selected' : '') + '>' + r + '</option>';
        }).join('') + '</select>') +
    '</div>' +

    '<div class="filters-foot">' +
      '<div class="field" style="flex:1;min-width:250px;max-width:420px">' +
        '<label class="label" for="f-score">Score mínimo de oportunidade</label>' +
        '<div class="range-row"><input type="range" id="f-score" min="0" max="100" step="5" value="' + estado.scoreMin + '">' +
        '<span class="range-val" id="f-score-v">' + estado.scoreMin + '</span></div>' +
      '</div>' +
      '<button class="btn btn-primary btn-lg" id="buscar">' + global.ico('search', 17) + ' BUSCAR EMPRESAS</button>' +
    '</div>';
  }

  function campo(rotulo, controle) {
    return '<div class="field"><label class="label">' + global.UI.esc(rotulo) + '</label>' + controle + '</div>';
  }

  function simNao(id, valor) {
    return '<select class="select" id="' + id + '">' +
      '<option value="">Indiferente</option>' +
      '<option value="sim"' + (valor === 'sim' ? ' selected' : '') + '>Sim</option>' +
      '<option value="nao"' + (valor === 'nao' ? ' selected' : '') + '>Não</option></select>';
  }

  function ligarFiltros(page) {
    var ui = global.UI;
    var mapa = { 'f-uf': 'uf', 'f-cidade': 'cidade', 'f-segmento': 'segmento', 'f-cnae': 'cnae',
                 'f-nome': 'nome', 'f-situacao': 'situacao', 'f-telefone': 'telefone',
                 'f-whatsapp': 'whatsapp', 'f-email': 'email', 'f-site': 'site' };

    Object.keys(mapa).forEach(function (id) {
      var el = page.querySelector('#' + id);
      if (!el) return;
      el.addEventListener('change', function () { estado[mapa[id]] = el.value; });
      if (el.tagName === 'INPUT') {
        el.addEventListener('input', function () { estado[mapa[id]] = el.value; });
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter') buscar(page); });
      }
    });

    var rng = page.querySelector('#f-score');
    var rngV = page.querySelector('#f-score-v');
    rng.addEventListener('input', function () {
      estado.scoreMin = parseInt(rng.value, 10);
      rngV.textContent = rng.value;
    });

    page.querySelector('#buscar').addEventListener('click', function () { buscar(page); });

    page.querySelector('#limpar').addEventListener('click', function () {
      estado = { uf: '', cidade: '', segmento: '', cnae: '', nome: '', situacao: 'ATIVA',
                 telefone: '', whatsapp: '', email: '', site: 'todos', scoreMin: 0,
                 ordem: estado.ordem, modo: estado.modo, buscou: false, resultados: [] };
      global.App.recarregar();
    });
  }

  /* ---------------- Filtragem ---------------- */
  function filtrar() {
    var termo = estado.nome.trim().toLowerCase();
    return global.Store.empresas().filter(function (c) {
      if (estado.uf && c.uf !== estado.uf) return false;
      if (estado.cidade && c.cidade !== estado.cidade) return false;
      if (estado.segmento && c.segmento !== estado.segmento) return false;
      if (estado.cnae && c.cnae !== estado.cnae) return false;
      if (estado.situacao && (c.situacao || '').toUpperCase() !== estado.situacao) return false;
      if (termo && c.nome.toLowerCase().indexOf(termo) === -1 &&
          (c.razaoSocial || '').toLowerCase().indexOf(termo) === -1) return false;
      if (estado.telefone === 'sim' && !c.telefone) return false;
      if (estado.telefone === 'nao' && c.telefone) return false;
      if (estado.whatsapp === 'sim' && !c.whatsapp) return false;
      if (estado.whatsapp === 'nao' && c.whatsapp) return false;
      if (estado.email === 'sim' && !c.email) return false;
      if (estado.email === 'nao' && c.email) return false;
      if (estado.site === 'sem' && c.website) return false;
      if (estado.site === 'com' && !c.website) return false;
      if (estado.site === 'fraco' && !(c.website && c.siteFraco)) return false;
      if (c.score < estado.scoreMin) return false;
      return true;
    }).sort(ordenador());
  }

  function ordenador() {
    switch (estado.ordem) {
      case 'nome': return function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); };
      case 'cidade': return function (a, b) { return a.cidade.localeCompare(b.cidade, 'pt-BR') || b.score - a.score; };
      case 'valor': return function (a, b) { return b.valorPotencial - a.valorPotencial; };
      case 'recente': return function (a, b) { return (b.descoberto_em || '').localeCompare(a.descoberto_em || ''); };
      default: return function (a, b) { return b.score - a.score || a.nome.localeCompare(b.nome, 'pt-BR'); };
    }
  }

  /* ---------------- Renderização ---------------- */
  function renderInicial(page) {
    var ui = global.UI;
    var total = global.Store.empresas().length;
    var semSite = global.Store.empresas().filter(function (c) { return !c.website; }).length;
    page.querySelector('#resultados').innerHTML =
      '<div class="card">' + ui.vazio('radar', 'Pronto para buscar',
        'Ajuste os filtros acima e clique em BUSCAR EMPRESAS. A base de demonstração tem ' + total +
        ' empresas, sendo ' + semSite + ' sem site próprio.',
        '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:6px">' +
        '<button class="btn btn-primary btn-sm" data-preset="sem-site">Empresas sem site</button>' +
        '<button class="btn btn-ghost btn-sm" data-preset="alto-score">Score 75 ou mais</button>' +
        '<button class="btn btn-ghost btn-sm" data-preset="lem">Luís Eduardo Magalhães/BA</button>' +
        '</div>') + '</div>';

    ui.aoClicar(page, '[data-preset]', function (b) {
      var p = b.dataset.preset;
      if (p === 'sem-site') { estado.site = 'sem'; }
      if (p === 'alto-score') { estado.scoreMin = 75; }
      if (p === 'lem') { estado.cidade = 'Luís Eduardo Magalhães'; estado.uf = 'BA'; }
      buscarComFiltrosAplicados(page);
    });
  }

  function buscarComFiltrosAplicados(page) {
    /* Repinta os controles para refletir o preset antes de exibir os resultados */
    estado.buscou = true;
    estado.resultados = filtrar();
    global.App.recarregar();
  }

  function buscar(page) {
    var alvo = page.querySelector('#resultados');
    alvo.innerHTML = '<div class="card"><div class="card-head"><div class="card-title">' +
      '<span class="spinner dark" style="display:inline-block;vertical-align:-2px;margin-right:8px"></span>' +
      'Analisando empresas…</div></div><div>' + global.UI.esqueleto(6) + '</div></div>';

    setTimeout(function () {
      estado.buscou = true;
      estado.resultados = filtrar();
      renderResultados(page);
      if (!estado.resultados.length) global.UI.toast('Nenhuma empresa atende a esses filtros.', 'info');
      else global.UI.toast(estado.resultados.length + ' empresa(s) encontrada(s).');
    }, 420);
  }

  function renderResultados(page) {
    var ui = global.UI;
    var lista = estado.resultados;
    var alvo = page.querySelector('#resultados');

    if (!lista.length) {
      alvo.innerHTML = '<div class="card">' + ui.vazio('search', 'Nenhuma empresa encontrada',
        'Nenhum registro atende à combinação de filtros selecionada. Tente ampliar o score mínimo, ' +
        'remover o filtro de cidade ou mudar a opção de site.',
        '<button class="btn btn-ghost btn-sm" id="v-limpar">Limpar filtros</button>') + '</div>';
      var bl = alvo.querySelector('#v-limpar');
      if (bl) bl.addEventListener('click', function () { page.querySelector('#limpar').click(); });
      return;
    }

    var semSite = lista.filter(function (c) { return !c.website; }).length;
    var potencial = lista.reduce(function (s, c) { return s + c.valorPotencial; }, 0);

    alvo.innerHTML =
      '<div class="card"><div class="card-head">' +
        '<div><div class="card-title">' + lista.length + ' empresa' + (lista.length > 1 ? 's' : '') + ' encontrada' + (lista.length > 1 ? 's' : '') + '</div>' +
        '<div class="card-sub">' + semSite + ' sem site · potencial somado de ' + ui.brl(potencial) + '</div></div>' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
          '<select class="select" id="ordem" style="width:auto;min-width:168px">' +
            [['score', 'Maior score'], ['valor', 'Maior potencial'], ['nome', 'Nome (A–Z)'],
             ['cidade', 'Cidade'], ['recente', 'Encontradas recentemente']].map(function (o) {
              return '<option value="' + o[0] + '"' + (estado.ordem === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
            }).join('') + '</select>' +
          '<div class="seg-toggle">' +
            '<button data-modo="tabela" class="' + (modoAtual() === 'tabela' ? 'active' : '') + '">' +
              global.ico('grid', 14) + '<span class="desktop-only">Tabela</span></button>' +
            '<button data-modo="cards" class="' + (modoAtual() === 'cards' ? 'active' : '') + '">' +
              global.ico('layers', 14) + '<span class="desktop-only">Cards</span></button>' +
          '</div>' +
          '<button class="btn btn-ghost btn-sm" id="exportar">' + global.ico('download', 14) + '<span class="desktop-only"> CSV</span></button>' +
        '</div>' +
      '</div>' +
      (modoAtual() === 'tabela' ? tabela(lista) : '<div class="card-pad"><div class="grid g-3">' +
        lista.map(cardEmpresa).join('') + '</div></div>') +
      '</div>';

    alvo.querySelector('#ordem').addEventListener('change', function (e) {
      estado.ordem = e.target.value;
      estado.resultados = filtrar();
      renderResultados(page);
    });

    ui.aoClicar(alvo, '[data-modo]', function (b) {
      estado.modo = b.dataset.modo;
      renderResultados(page);
    });

    alvo.querySelector('#exportar').addEventListener('click', function () { exportarCsv(lista); });

    ligarAcoes(alvo, page);
  }

  function tabela(lista) {
    var ui = global.UI;
    return '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>Empresa</th><th>Segmento</th><th>Cidade/UF</th><th>Telefone</th><th>Site</th>' +
      '<th>Redes sociais</th><th>Score</th><th>Status</th><th style="text-align:right">Ações</th>' +
      '</tr></thead><tbody>' +
      lista.map(function (c) {
        var f = global.Score.faixa(c.score);
        return '<tr>' +
          '<td><a class="cell-company" href="#/app/empresa/' + c.id + '">' + ui.logoEmpresa(c.nome) +
            '<span style="min-width:0"><span class="co-name">' + ui.esc(c.nome) + '</span>' +
            '<span class="co-sub">' + ui.esc(c.cnpj) + '</span></span></a></td>' +
          '<td class="soft">' + ui.esc(c.segmento) + '<div class="co-sub">' + ui.esc(c.cnae) + '</div></td>' +
          '<td class="soft">' + ui.esc(c.cidade) + '<div class="co-sub">' + ui.esc(c.uf) + '</div></td>' +
          '<td>' + (c.telefone
            ? '<span class="mono">' + ui.esc(c.telefone) + '</span>' +
              (c.whatsapp ? '<div class="co-sub" style="color:var(--emerald-600);font-weight:600">WhatsApp disponível</div>' : '')
            : '<span class="muted">não encontrado</span>') + '</td>' +
          '<td>' + (c.website
            ? (c.siteFraco
              ? '<span class="badge badge-amber badge-dot">Site fraco</span>'
              : '<a class="link" href="https://' + ui.esc(c.website) + '" target="_blank" rel="noopener">' +
                ui.esc(c.website) + '</a>')
            : '<span class="badge badge-emerald badge-dot">Não encontrado</span>') + '</td>' +
          '<td>' + ui.pilulasPresenca(c) + '</td>' +
          '<td>' + ui.scoreCelula(c.score) + '</td>' +
          '<td><span class="badge ' + f.badge + '">' + ui.esc(f.curto) + '</span></td>' +
          '<td><div class="row-actions">' + botoesAcao(c, true) + '</div></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function cardEmpresa(c) {
    var ui = global.UI;
    var f = global.Score.faixa(c.score);
    return '<div class="co-card">' +
      '<div class="co-card-top">' + ui.logoEmpresa(c.nome) +
        '<div style="flex:1;min-width:0">' +
          '<a href="#/app/empresa/' + c.id + '" class="co-name" style="display:block">' + ui.esc(c.nome) + '</a>' +
          '<div class="co-sub">' + ui.esc(c.segmento) + ' · ' + ui.esc(c.cidade) + '/' + ui.esc(c.uf) + '</div>' +
        '</div>' +
        '<div style="text-align:right"><div class="score-badge ' + f.classe + '">' + c.score + '<small>/100</small></div></div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
        linhaMeta('phone', c.telefone, 'Telefone não encontrado') +
        linhaMeta('whatsapp', c.whatsapp, 'WhatsApp não encontrado') +
        linhaMeta('globe', c.website ? (c.siteFraco ? c.website + ' (fraco)' : c.website) : null, 'Website não encontrado') +
        linhaMeta('instagram', c.instagram, 'Instagram não encontrado') +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap">' +
        '<span class="badge ' + f.badge + ' badge-dot">' + ui.esc(f.nome) + '</span>' +
        '<span class="mono" style="font-size:12.5px;font-weight:700;color:var(--emerald-600)">' +
        ui.brl(c.valorPotencial) + '</span>' +
      '</div>' +
      '<div class="co-card-actions">' + botoesAcao(c, false) + '</div>' +
    '</div>';
  }

  function linhaMeta(icone, valor, vazio) {
    var ui = global.UI;
    var ok = !!valor;
    return '<div class="co-meta-line" style="' + (ok ? '' : 'color:var(--text-muted)') + '">' +
      '<span style="color:' + (ok ? 'var(--emerald-600)' : 'var(--text-muted)') + '">' +
      global.ico(icone, 14) + '</span>' +
      '<span class="truncate">' + ui.esc(ok ? valor : vazio) + '</span></div>';
  }

  function botoesAcao(c, compacto) {
    var noCrm = !!global.Store.leadDaEmpresa(c.id);
    var temDemo = !!global.Store.demoDaEmpresa(c.id);
    if (compacto) {
      return '<a class="btn btn-ghost btn-sm" href="#/app/empresa/' + c.id + '" title="Ver empresa">' +
          global.ico('eye', 14) + '</a>' +
        '<button class="btn btn-ghost btn-sm" data-demo="' + c.id + '" title="' +
          (temDemo ? 'Demonstração já criada' : 'Criar site demonstração') + '">' + global.ico('layout', 14) + '</button>' +
        '<button class="btn btn-ghost btn-sm" data-msg="' + c.id + '" title="Gerar abordagem">' +
          global.ico('sparkles', 14) + '</button>' +
        '<button class="btn ' + (noCrm ? 'btn-ghost' : 'btn-soft') + ' btn-sm" data-crm="' + c.id + '" ' +
          (noCrm ? 'disabled' : '') + ' title="' + (noCrm ? 'Já está no CRM' : 'Adicionar ao CRM') + '">' +
          global.ico(noCrm ? 'check' : 'plus', 14) + '</button>';
    }
    return '<a class="btn btn-ghost btn-sm" href="#/app/empresa/' + c.id + '">' + global.ico('eye', 14) + ' VER EMPRESA</a>' +
      '<button class="btn btn-ghost btn-sm" data-demo="' + c.id + '">' + global.ico('layout', 14) + ' CRIAR DEMO</button>' +
      '<button class="btn btn-ghost btn-sm" data-msg="' + c.id + '">' + global.ico('sparkles', 14) + ' ABORDAGEM</button>' +
      '<button class="btn ' + (noCrm ? 'btn-ghost' : 'btn-soft') + ' btn-sm" data-crm="' + c.id + '" ' +
        (noCrm ? 'disabled' : '') + '>' + global.ico(noCrm ? 'check' : 'plus', 14) + ' ' +
        (noCrm ? 'NO CRM' : 'AO CRM') + '</button>';
  }

  function ligarAcoes(alvo, page) {
    var ui = global.UI;
    ui.aoClicar(alvo, '[data-crm]', function (b) {
      if (b.disabled) return;
      var r = global.Store.criarLead(b.dataset.crm, 'novo');
      if (!r.ok) { ui.toast(r.erro, 'err'); return; }
      ui.toast('Empresa adicionada ao CRM.');
      global.App.pintarNav('radar');
      renderResultados(page);
    });
    ui.aoClicar(alvo, '[data-demo]', function (b) {
      global.Acoes.criarDemo(b.dataset.demo, function () {
        global.App.pintarNav('radar');
        renderResultados(page);
      });
    });
    ui.aoClicar(alvo, '[data-msg]', function (b) {
      global.Acoes.gerarAbordagem(b.dataset.msg);
    });
  }

  /* ---------------- Exportação ---------------- */
  function exportarCsv(lista) {
    var cab = ['empresa', 'razao_social', 'cnpj', 'cnae', 'segmento', 'cidade', 'estado',
               'telefone', 'whatsapp', 'email', 'website', 'instagram', 'facebook',
               'situacao', 'score', 'faixa', 'valor_potencial'];
    var linhas = lista.map(function (c) {
      return [c.nome, c.razaoSocial, c.cnpj, c.cnae, c.segmento, c.cidade, c.uf,
              c.telefone, c.whatsapp, c.email, c.website, c.instagram, c.facebook,
              c.situacao, c.score, c.scoreFaixa, c.valorPotencial].map(csvCampo).join(';');
    });
    var csv = '﻿' + cab.join(';') + '\n' + linhas.join('\n');
    global.App.baixar('sitehunter-empresas.csv', csv, 'text/csv;charset=utf-8');
    global.UI.toast(lista.length + ' empresa(s) exportada(s) em CSV.');
  }

  function csvCampo(v) {
    if (v === null || v === undefined) return '';
    var s = String(v);
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
})(window);
