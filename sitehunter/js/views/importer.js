/* SiteHunter AI — Importação de leads via CSV */
(function (global) {
  'use strict';
  global.Views = global.Views || {};

  var COLUNAS = [
    { chave: 'empresa',   rotulo: 'Empresa',    obrigatoria: true,  aliases: ['empresa', 'nome', 'nome_fantasia', 'fantasia', 'razao', 'razao_social'] },
    { chave: 'cnpj',      rotulo: 'CNPJ',       obrigatoria: false, aliases: ['cnpj', 'documento'] },
    { chave: 'cidade',    rotulo: 'Cidade',     obrigatoria: true,  aliases: ['cidade', 'municipio', 'município'] },
    { chave: 'estado',    rotulo: 'Estado',     obrigatoria: true,  aliases: ['estado', 'uf'] },
    { chave: 'segmento',  rotulo: 'Segmento',   obrigatoria: false, aliases: ['segmento', 'ramo', 'atividade', 'categoria'] },
    { chave: 'telefone',  rotulo: 'Telefone',   obrigatoria: false, aliases: ['telefone', 'fone', 'tel', 'celular', 'whatsapp'] },
    { chave: 'email',     rotulo: 'E-mail',     obrigatoria: false, aliases: ['email', 'e-mail', 'mail'] },
    { chave: 'website',   rotulo: 'Website',    obrigatoria: false, aliases: ['website', 'site', 'url', 'web'] },
    { chave: 'instagram', rotulo: 'Instagram',  obrigatoria: false, aliases: ['instagram', 'insta', 'ig'] }
  ];

  var MODELO = 'empresa;cnpj;cidade;estado;segmento;telefone;email;website;instagram\n' +
    'PADARIA PÃO QUENTE;11.222.333/0001-44;Barreiras;BA;Comércio Varejista;(77) 3611-0000;;;@paoquente\n' +
    'CLÍNICA BEM ESTAR;;Luís Eduardo Magalhães;BA;Clínica Médica;(77) 99900-0000;contato@exemplo.com.br;;\n';

  var estado = { linhas: null, cabecalho: null, mapeamento: {}, nomeArquivo: '' };

  global.Views.importar = function (page) {
    var ui = global.UI;

    page.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">Importar Leads</h1>' +
        '<p class="page-sub">Traga sua própria lista em CSV. As colunas são detectadas automaticamente e ' +
        'você confere tudo antes de confirmar.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-ghost" id="modelo">' + global.ico('download', 16) + ' Baixar modelo CSV</button>' +
        '</div>' +
      '</div>' +

      '<div class="card"><div class="card-head"><div>' +
        '<div class="card-title">1. Selecione o arquivo</div>' +
        '<div class="card-sub">Formato CSV separado por ponto e vírgula ou vírgula, codificação UTF-8</div></div></div>' +
        '<div class="card-pad">' +
          '<div class="drop" id="drop">' +
            '<div class="empty-ico" style="margin:0 auto 13px">' + global.ico('upload', 25) + '</div>' +
            '<div class="empty-title">Arraste o arquivo aqui</div>' +
            '<p class="empty-text" style="margin:7px auto 15px">ou clique para escolher no seu computador</p>' +
            '<button class="btn btn-primary btn-sm" type="button" id="escolher">Escolher arquivo CSV</button>' +
            '<input type="file" id="arquivo" accept=".csv,text/csv" hidden>' +
          '</div>' +
          '<div style="margin-top:18px"><div class="label" style="margin-bottom:9px">Colunas aceitas</div>' +
          '<div style="display:flex;gap:7px;flex-wrap:wrap">' + COLUNAS.map(function (c) {
            return '<span class="badge ' + (c.obrigatoria ? 'badge-emerald' : 'badge-gray') + '">' +
              ui.esc(c.chave) + (c.obrigatoria ? ' *' : '') + '</span>';
          }).join('') + '</div>' +
          '<p class="hint" style="margin-top:9px">* obrigatórias. Nomes equivalentes como ' +
          '<code>nome</code>, <code>municipio</code> ou <code>uf</code> também são reconhecidos.</p></div>' +
        '</div>' +
      '</div>' +

      '<div id="preview" class="section-gap"></div>' +

      '<div class="card section-gap"><div class="card-pad" style="display:flex;gap:13px;align-items:flex-start">' +
        '<span style="color:var(--text-muted)">' + global.ico('shield', 19) + '</span>' +
        '<div><div style="font-weight:650;font-size:13.5px;margin-bottom:5px">Responsabilidade sobre os dados importados</div>' +
        '<p class="hint">Ao importar uma lista, você declara ter base legal para tratar esses dados ' +
        '(LGPD, art. 7º). O SiteHunter AI não coleta dados de terceiros por conta própria nem realiza ' +
        'raspagem de serviços que a proíbam. Consulte a <a href="#/legal/dados" class="link">origem dos dados</a> ' +
        'e o processo de <a href="#/legal/remocao" class="link">remoção e opt-out</a>.</p></div>' +
      '</div></div>';

    var input = page.querySelector('#arquivo');
    var drop = page.querySelector('#drop');

    page.querySelector('#escolher').addEventListener('click', function () { input.click(); });
    drop.addEventListener('click', function (e) { if (e.target === drop || e.target.closest('.empty-ico, .empty-title, .empty-text')) input.click(); });
    input.addEventListener('change', function () { if (input.files[0]) lerArquivo(input.files[0], page); });

    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer.files[0];
      if (f) lerArquivo(f, page);
    });

    page.querySelector('#modelo').addEventListener('click', function () {
      global.App.baixar('modelo-sitehunter.csv', '﻿' + MODELO, 'text/csv;charset=utf-8');
      global.UI.toast('Modelo CSV baixado.');
    });

    if (estado.linhas) renderPreview(page);
  };

  /* ---------- Leitura e parsing ---------- */
  function lerArquivo(file, page) {
    var ui = global.UI;
    if (!/\.csv$/i.test(file.name) && file.type.indexOf('csv') === -1) {
      ui.toast('Selecione um arquivo .csv.', 'err');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      ui.toast('Arquivo muito grande. O limite é de 5 MB.', 'err');
      return;
    }

    var leitor = new FileReader();
    leitor.onerror = function () { ui.toast('Não foi possível ler o arquivo.', 'err'); };
    leitor.onload = function () {
      try {
        var texto = String(leitor.result).replace(/^﻿/, '');
        var dados = parseCsv(texto);
        if (dados.length < 2) {
          ui.toast('O arquivo precisa ter um cabeçalho e ao menos uma linha de dados.', 'err');
          return;
        }
        estado.cabecalho = dados[0];
        estado.linhas = dados.slice(1).filter(function (l) {
          return l.some(function (celula) { return String(celula).trim() !== ''; });
        });
        estado.nomeArquivo = file.name;
        estado.mapeamento = detectarColunas(estado.cabecalho);
        renderPreview(page);
        ui.toast(estado.linhas.length + ' linha(s) lida(s) de ' + file.name + '.');
      } catch (err) {
        console.error(err);
        ui.toast('Falha ao interpretar o CSV: ' + err.message, 'err');
      }
    };
    leitor.readAsText(file, 'UTF-8');
  }

  /* Parser CSV com suporte a aspas, quebras de linha internas e ; ou , */
  function parseCsv(texto) {
    var sep = detectarSeparador(texto);
    var linhas = [], campo = '', linha = [], dentroAspas = false, i;
    for (i = 0; i < texto.length; i++) {
      var ch = texto[i];
      if (dentroAspas) {
        if (ch === '"') {
          if (texto[i + 1] === '"') { campo += '"'; i++; }
          else dentroAspas = false;
        } else campo += ch;
      } else if (ch === '"') dentroAspas = true;
      else if (ch === sep) { linha.push(campo); campo = ''; }
      else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
      else if (ch !== '\r') campo += ch;
    }
    if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas.map(function (l) { return l.map(function (c) { return c.trim(); }); });
  }

  function detectarSeparador(texto) {
    var primeira = texto.split('\n')[0] || '';
    var ponto = (primeira.match(/;/g) || []).length;
    var virgula = (primeira.match(/,/g) || []).length;
    var tab = (primeira.match(/\t/g) || []).length;
    if (tab > ponto && tab > virgula) return '\t';
    return virgula > ponto ? ',' : ';';
  }

  function normalizar(s) {
    return String(s || '').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  }

  function detectarColunas(cabecalho) {
    var mapa = {};
    COLUNAS.forEach(function (col) {
      var achou = -1;
      cabecalho.forEach(function (h, i) {
        if (achou !== -1) return;
        var n = normalizar(h);
        if (col.aliases.some(function (a) { return normalizar(a) === n; })) achou = i;
      });
      mapa[col.chave] = achou;
    });
    return mapa;
  }

  /* ---------- Preview ---------- */
  function renderPreview(page) {
    var ui = global.UI;
    var alvo = page.querySelector('#preview');
    if (!estado.linhas) { alvo.innerHTML = ''; return; }

    var registros = estado.linhas.map(montarRegistro);
    var validos = registros.filter(function (r) { return r.ok; });
    var invalidos = registros.filter(function (r) { return !r.ok; });
    var faltando = COLUNAS.filter(function (c) { return c.obrigatoria && estado.mapeamento[c.chave] === -1; });

    alvo.innerHTML =
      '<div class="card"><div class="card-head"><div>' +
        '<div class="card-title">2. Confira o mapeamento das colunas</div>' +
        '<div class="card-sub">' + ui.esc(estado.nomeArquivo) + ' · ' + estado.linhas.length + ' linha(s)</div></div>' +
        '<button class="btn btn-ghost btn-sm" id="cancelar">' + global.ico('x', 14) + ' Descartar</button>' +
      '</div>' +
      '<div class="card-pad">' +
        COLUNAS.map(function (col) {
          var idx = estado.mapeamento[col.chave];
          return '<div class="map-row">' +
            '<div><span class="data-k">' + ui.esc(col.rotulo) + (col.obrigatoria ? ' *' : '') + '</span>' +
            '<span class="map-src">' + ui.esc(col.chave) + '</span></div>' +
            '<span class="muted">' + global.ico('arrowRight', 15) + '</span>' +
            '<select class="select" data-col="' + col.chave + '">' +
              '<option value="-1">— não importar —</option>' +
              estado.cabecalho.map(function (h, i) {
                return '<option value="' + i + '"' + (i === idx ? ' selected' : '') + '>' +
                  ui.esc(h || ('coluna ' + (i + 1))) + '</option>';
              }).join('') + '</select></div>';
        }).join('') +
        (faltando.length
          ? '<div style="margin-top:16px;padding:13px 15px;background:var(--rose-soft);color:var(--rose);' +
            'border-radius:var(--r);font-size:12.5px;line-height:1.6">' + global.ico('alert', 15) +
            ' Colunas obrigatórias não mapeadas: ' + faltando.map(function (c) { return c.rotulo; }).join(', ') +
            '. Ajuste o mapeamento acima para continuar.</div>'
          : '') +
      '</div></div>' +

      '<div class="card section-gap"><div class="card-head">' +
        '<div><div class="card-title">3. Pré-visualização</div>' +
        '<div class="card-sub">' + validos.length + ' registro(s) prontos para importar' +
        (invalidos.length ? ' · ' + invalidos.length + ' com problema' : '') + '</div></div>' +
        '<button class="btn btn-primary" id="confirmar" ' + (validos.length && !faltando.length ? '' : 'disabled') + '>' +
          global.ico('check', 16) + ' Importar ' + validos.length + ' empresa(s)</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr>' +
        '<th style="width:34px"></th><th>Empresa</th><th>Cidade/UF</th><th>Segmento</th>' +
        '<th>Telefone</th><th>Site</th><th>Score previsto</th></tr></thead><tbody>' +
        registros.slice(0, 40).map(function (r, i) {
          if (!r.ok) {
            return '<tr style="background:var(--rose-soft)">' +
              '<td>' + global.ico('xCircle', 15) + '</td>' +
              '<td colspan="6" style="font-size:12.5px;color:var(--rose)">Linha ' + (i + 2) + ': ' +
              ui.esc(r.erro) + '</td></tr>';
          }
          var c = r.empresa;
          return '<tr><td style="color:var(--emerald-600)">' + global.ico('check', 15) + '</td>' +
            '<td><div class="co-name">' + ui.esc(c.nome) + '</div>' +
            (c.cnpj ? '<div class="co-sub">' + ui.esc(c.cnpj) + '</div>' : '') + '</td>' +
            '<td class="soft">' + ui.esc(c.cidade) + '/' + ui.esc(c.uf) + '</td>' +
            '<td class="soft">' + ui.esc(c.segmento) + '</td>' +
            '<td class="soft mono">' + ui.esc(c.telefone || '—') + '</td>' +
            '<td>' + (c.website
              ? '<span class="badge badge-gray">' + ui.esc(c.website) + '</span>'
              : '<span class="badge badge-emerald badge-dot">Sem site</span>') + '</td>' +
            '<td>' + ui.scoreCelula(c.score) + '</td></tr>';
        }).join('') +
      '</tbody></table></div>' +
      (registros.length > 40
        ? '<div class="card-pad"><p class="hint">Mostrando as primeiras 40 linhas de ' +
          registros.length + '. Todas serão importadas.</p></div>'
        : '') +
      '</div>';

    alvo.querySelectorAll('[data-col]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        estado.mapeamento[sel.dataset.col] = parseInt(sel.value, 10);
        renderPreview(page);
      });
    });

    alvo.querySelector('#cancelar').addEventListener('click', function () {
      estado = { linhas: null, cabecalho: null, mapeamento: {}, nomeArquivo: '' };
      global.App.recarregar();
    });

    var bc = alvo.querySelector('#confirmar');
    if (bc && !bc.disabled) {
      bc.addEventListener('click', function () {
        var r = global.Store.adicionarEmpresas(validos.map(function (x) { return x.empresa; }));
        estado = { linhas: null, cabecalho: null, mapeamento: {}, nomeArquivo: '' };
        ui.toast(r.adicionadas + ' empresa(s) importada(s)' +
          (r.duplicadas ? ' · ' + r.duplicadas + ' ignorada(s) por duplicidade' : '') + '.');
        global.Router.ir('/app/radar');
      });
    }
  }

  function montarRegistro(linha) {
    function val(chave) {
      var i = estado.mapeamento[chave];
      return (i >= 0 && linha[i] !== undefined) ? String(linha[i]).trim() : '';
    }
    var nome = val('empresa');
    var cidade = val('cidade');
    var uf = val('estado').toUpperCase().slice(0, 2);

    if (!nome) return { ok: false, erro: 'nome da empresa vazio' };
    if (!cidade) return { ok: false, erro: 'cidade não informada' };
    if (!uf) return { ok: false, erro: 'estado (UF) não informado' };

    var telefone = val('telefone');
    var website = val('website').replace(/^https?:\/\//, '').replace(/\/$/, '');
    var segmento = val('segmento') || 'Serviços Gerais';

    var empresa = {
      nome: nome.toUpperCase(),
      razaoSocial: nome,
      cnpj: val('cnpj') || null,
      cnae: null,
      segmento: segmento,
      abertura: null,
      cidade: cidade,
      uf: uf,
      bairro: null,
      endereco: null,
      cep: null,
      telefone: telefone || null,
      whatsapp: ehCelular(telefone) ? telefone : null,
      email: val('email') || null,
      website: website || null,
      siteFraco: false,
      dominioProprio: !!website,
      instagram: val('instagram') || null,
      facebook: null,
      googleBusiness: false,
      situacao: 'ATIVA',
      porte: 'PEQUENO',
      servicos: [],
      origem: 'Importação CSV — ' + estado.nomeArquivo
    };

    global.Dados.preparar(empresa);
    return { ok: true, empresa: empresa };
  }

  /* Celulares brasileiros têm 9 dígitos após o DDD e começam com 9 */
  function ehCelular(tel) {
    var d = global.UI.soDigitos(tel);
    if (d.length === 11) return d[2] === '9';
    if (d.length === 13 && d.slice(0, 2) === '55') return d[4] === '9';
    return false;
  }
})(window);
