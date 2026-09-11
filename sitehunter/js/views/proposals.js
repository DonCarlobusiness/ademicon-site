/* SiteHunter AI — Propostas comerciais */
(function (global) {
  'use strict';
  global.Views = global.Views || {};

  var STATUS = {
    rascunho: { r: 'Rascunho', b: 'badge-gray' },
    enviada:  { r: 'Enviada', b: 'badge-sky' },
    aceita:   { r: 'Aceita', b: 'badge-emerald' },
    recusada: { r: 'Recusada', b: 'badge-rose' }
  };

  /* ---------------- Lista ---------------- */
  global.Views.propostas = function (page) {
    var ui = global.UI;
    var props = global.Store.propostas().slice().sort(function (a, b) {
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    var emNegociacao = props.filter(function (p) { return p.status === 'enviada'; })
      .reduce(function (s, p) { return s + p.valor; }, 0);
    var aceitas = props.filter(function (p) { return p.status === 'aceita'; });
    var fechado = aceitas.reduce(function (s, p) { return s + p.valor; }, 0);

    page.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">Propostas</h1>' +
        '<p class="page-sub">Gere propostas comerciais com os pacotes padrão ou valores personalizados ' +
        'e acompanhe o status de cada negociação.</p></div>' +
        '<div class="page-actions">' +
          '<a href="#/app/configuracoes?aba=pacotes" class="btn btn-ghost">' + global.ico('settings', 16) + ' Editar pacotes</a>' +
          '<button class="btn btn-primary" id="nova-prop">' + global.ico('plus', 16) + ' GERAR PROPOSTA</button>' +
        '</div>' +
      '</div>' +

      '<div class="grid g-kpi">' +
        kpi('Propostas geradas', props.length, 'doc', 'sky') +
        kpi('Em negociação', ui.brl(emNegociacao), 'clock', 'amber') +
        kpi('Aceitas', aceitas.length, 'checkCircle', 'emerald') +
        kpi('Receita fechada', ui.brl(fechado), 'money', 'emerald') +
      '</div>' +

      '<div class="card section-gap"><div class="card-head">' +
        '<div><div class="card-title">Pacotes disponíveis</div>' +
        '<div class="card-sub">Valores sugeridos — editáveis em Configurações</div></div></div>' +
        '<div class="card-pad"><div class="grid g-3">' +
          global.Store.pacotes().map(function (p) {
            return '<div class="price-card ' + (p.destaque ? 'featured' : '') + '" style="padding:20px">' +
              (p.destaque ? '<span class="price-tag badge badge-emerald">MAIS VENDIDO</span>' : '') +
              '<div><div class="card-sub" style="margin:0 0 5px">' + ui.esc(p.nome) + '</div>' +
              '<div class="price-val" style="font-size:29px">' + ui.brl(p.valor) + '</div>' +
              '<div class="hint" style="margin-top:4px">' + ui.esc(p.prazo) + '</div></div>' +
              '<ul class="price-list" style="font-size:12.5px">' + p.itens.slice(0, 4).map(function (i) {
                return '<li>' + global.ico('check', 14) + '<span>' + ui.esc(i) + '</span></li>';
              }).join('') + (p.itens.length > 4
                ? '<li class="muted" style="padding-left:23px">+ ' + (p.itens.length - 4) + ' itens</li>' : '') + '</ul>' +
              '</div>';
          }).join('') +
        '</div></div>' +
      '</div>' +

      '<div class="card section-gap"><div class="card-head">' +
        '<div><div class="card-title">Propostas emitidas</div></div></div>' +
        (props.length
          ? '<div class="table-wrap"><table class="tbl"><thead><tr>' +
            '<th>Empresa</th><th>Pacote</th><th>Valor</th><th>Prazo</th><th>Emitida em</th><th>Status</th>' +
            '<th style="text-align:right">Ações</th></tr></thead><tbody>' +
            props.map(linha).join('') + '</tbody></table></div>'
          : ui.vazio('doc', 'Nenhuma proposta gerada',
              'Gere a primeira proposta a partir de uma empresa do CRM ou do Radar.',
              '<button class="btn btn-primary btn-sm" id="vazio-nova">Gerar proposta</button>')) +
      '</div>';

    function abrirNova() {
      escolherEmpresa(function (companyId) {
        global.Views.abrirGeradorProposta(companyId, function () { global.App.recarregar(); });
      });
    }
    page.querySelector('#nova-prop').addEventListener('click', abrirNova);
    var bv = page.querySelector('#vazio-nova');
    if (bv) bv.addEventListener('click', abrirNova);

    ui.aoClicar(page, '[data-status]', function (b) { mudarStatus(b.dataset.status); });
    ui.aoClicar(page, '[data-excluir]', function (b) {
      var p = propPorId(b.dataset.excluir);
      var c = p && global.Store.empresa(p.company_id);
      ui.confirmar('Excluir proposta',
        'A proposta de ' + (c ? c.nome : 'esta empresa') + ' será removida permanentemente.',
        function () {
          global.Store.removerProposta(p.id);
          ui.toast('Proposta excluída.', 'info');
          global.App.recarregar();
        }, 'Excluir', true);
    });
  };

  function propPorId(id) {
    return global.Store.propostas().filter(function (p) { return p.id === id; })[0];
  }

  function linha(p) {
    var ui = global.UI;
    var c = global.Store.empresa(p.company_id);
    var st = STATUS[p.status] || STATUS.rascunho;
    return '<tr>' +
      '<td>' + (c
        ? '<a class="cell-company" href="#/app/empresa/' + c.id + '">' + ui.logoEmpresa(c.nome) +
          '<span><span class="co-name">' + ui.esc(c.nome) + '</span>' +
          '<span class="co-sub">' + ui.esc(c.cidade) + '/' + ui.esc(c.uf) + '</span></span></a>'
        : '<span class="muted">Empresa removida</span>') + '</td>' +
      '<td class="soft">' + ui.esc(p.pacote_nome) + '</td>' +
      '<td class="mono" style="font-weight:700">' + ui.brl(p.valor) + '</td>' +
      '<td class="soft">' + ui.esc(p.prazo) + '</td>' +
      '<td class="soft">' + ui.data(p.created_at) + '</td>' +
      '<td><button class="badge ' + st.b + ' badge-dot" data-status="' + p.id + '" ' +
        'style="border:0;cursor:pointer">' + st.r + '</button></td>' +
      '<td><div class="row-actions">' +
        '<a class="btn btn-ghost btn-sm" href="#/app/proposta/' + p.id + '" title="Abrir proposta">' + global.ico('eye', 14) + '</a>' +
        '<button class="btn btn-ghost btn-sm" data-excluir="' + p.id + '" title="Excluir">' + global.ico('trash', 14) + '</button>' +
      '</div></td></tr>';
  }

  function kpi(rotulo, valor, icone, cor) {
    var cores = { sky: ['var(--sky-soft)', 'var(--sky)'], emerald: ['var(--accent-soft)', 'var(--accent-hover)'],
                  amber: ['var(--amber-soft)', 'var(--amber)'] }[cor];
    return '<div class="kpi"><div class="kpi-top"><span class="kpi-label">' + global.UI.esc(rotulo) + '</span>' +
      '<span class="kpi-ico" style="background:' + cores[0] + ';color:' + cores[1] + '">' + global.ico(icone, 16) + '</span></div>' +
      '<div class="kpi-value">' + valor + '</div></div>';
  }

  function mudarStatus(id) {
    var ui = global.UI;
    var p = propPorId(id);
    if (!p) return;
    ui.modal({
      titulo: 'Status da proposta',
      corpo: '<div style="display:flex;flex-direction:column;gap:8px">' +
        Object.keys(STATUS).map(function (k) {
          return '<button class="btn ' + (p.status === k ? 'btn-soft' : 'btn-ghost') + ' btn-block" ' +
            'data-novo="' + k + '" style="justify-content:flex-start">' +
            '<span class="badge ' + STATUS[k].b + ' badge-dot">' + STATUS[k].r + '</span></button>';
        }).join('') + '</div>',
      aoAbrir: function (m) {
        m.addEventListener('click', function (e) {
          var b = e.target.closest('[data-novo]');
          if (!b) return;
          var novo = b.dataset.novo;
          global.Store.atualizarProposta(p.id, { status: novo });
          var lead = global.Store.leadDaEmpresa(p.company_id);
          if (lead) {
            if (novo === 'aceita') global.Store.moverLead(lead.id, 'fechado');
            else if (novo === 'recusada') global.Store.moverLead(lead.id, 'perdido');
            else if (novo === 'enviada') global.Store.moverLead(lead.id, 'proposta');
          }
          ui.fecharModal();
          ui.toast('Status atualizado para ' + STATUS[novo].r + '.');
          global.App.recarregar();
        });
      }
    });
  }

  /* ---------------- Seleção de empresa ---------------- */
  function escolherEmpresa(aoEscolher) {
    var ui = global.UI;
    var lista = global.Store.empresas().slice().sort(function (a, b) { return b.score - a.score; });

    ui.modal({
      titulo: 'Para qual empresa?',
      corpo:
        '<input class="input" id="ep-busca" placeholder="Buscar empresa, cidade ou CNPJ…" autofocus>' +
        '<div id="ep-lista" style="margin-top:14px;max-height:340px;overflow-y:auto"></div>',
      aoAbrir: function (m) {
        var caixa = m.querySelector('#ep-lista');
        function pintar(termo) {
          var t = (termo || '').toLowerCase();
          var filtradas = lista.filter(function (c) {
            return !t || c.nome.toLowerCase().indexOf(t) !== -1 ||
              c.cidade.toLowerCase().indexOf(t) !== -1 ||
              ui.soDigitos(c.cnpj).indexOf(ui.soDigitos(t)) !== -1;
          }).slice(0, 40);

          caixa.innerHTML = filtradas.length
            ? filtradas.map(function (c) {
                return '<button class="sr-item" data-emp="' + c.id + '" style="width:100%;border:0;background:none;text-align:left">' +
                  ui.logoEmpresa(c.nome) +
                  '<span style="flex:1;min-width:0"><span class="sr-title truncate" style="display:block">' + ui.esc(c.nome) + '</span>' +
                  '<span class="sr-meta">' + ui.esc(c.cidade) + '/' + ui.esc(c.uf) + ' · ' + ui.esc(c.segmento) + '</span></span>' +
                  ui.scoreCelula(c.score) + '</button>';
              }).join('')
            : '<div class="sr-empty">Nenhuma empresa encontrada.</div>';
        }
        pintar('');
        m.querySelector('#ep-busca').addEventListener('input', function (e) { pintar(e.target.value); });
        caixa.addEventListener('click', function (e) {
          var b = e.target.closest('[data-emp]');
          if (!b) return;
          ui.fecharModal();
          aoEscolher(b.dataset.emp);
        });
      }
    });
  }

  /* ---------------- Gerador de proposta ---------------- */
  global.Views.abrirGeradorProposta = function (companyId, aoConcluir) {
    var ui = global.UI;
    var c = global.Store.empresa(companyId);
    if (!c) { ui.toast('Empresa não encontrada.', 'err'); return; }

    var pacotes = global.Store.pacotes();
    var sugerido = c.score >= 90 ? 'premium' : c.score >= 75 ? 'profissional' : 'essencial';
    var escolhido = pacotes.filter(function (p) { return p.id === sugerido; })[0] || pacotes[0];

    ui.modal({
      titulo: 'Gerar proposta comercial',
      subtitulo: c.nome + ' · score ' + c.score + '/100',
      largo: true,
      corpo:
        '<div class="field" style="margin-bottom:18px"><label class="label">Pacote</label>' +
        '<div class="style-grid" id="pk-opcoes">' + pacotes.map(function (p) {
          return '<button class="style-btn ' + (p.id === escolhido.id ? 'active' : '') + '" data-pk="' + p.id + '" ' +
            'style="padding:13px 9px"><span style="display:block;font-size:11.5px">' + ui.esc(p.nome) + '</span>' +
            '<span style="display:block;font-size:15px;font-weight:800;margin-top:4px">' + ui.brl(p.valor) + '</span></button>';
        }).join('') + '</div></div>' +

        '<div class="filters">' +
          '<div class="field"><label class="label" for="pr-empresa">Empresa</label>' +
          '<input class="input" id="pr-empresa" value="' + ui.esc(c.nome) + '" readonly></div>' +
          '<div class="field"><label class="label" for="pr-pacote">Nome do pacote</label>' +
          '<input class="input" id="pr-pacote" value="' + ui.esc(escolhido.nome) + '"></div>' +
          '<div class="field"><label class="label" for="pr-valor">Valor (R$)</label>' +
          '<input class="input mono" type="number" id="pr-valor" min="0" step="10" value="' + escolhido.valor + '"></div>' +
          '<div class="field"><label class="label" for="pr-prazo">Prazo de entrega</label>' +
          '<input class="input" id="pr-prazo" value="' + ui.esc(escolhido.prazo) + '"></div>' +
        '</div>' +

        '<div class="field" style="margin-top:14px"><label class="label" for="pr-itens">Itens inclusos (um por linha)</label>' +
        '<textarea class="textarea" id="pr-itens" style="min-height:150px">' + ui.esc(escolhido.itens.join('\n')) + '</textarea></div>' +

        '<div class="field" style="margin-top:14px"><label class="label" for="pr-obs">Observações (opcional)</label>' +
        '<input class="input" id="pr-obs" placeholder="Ex.: condição de pagamento, desconto combinado"></div>',
      rodape: '<button class="btn btn-ghost" data-fechar>Cancelar</button>' +
              '<button class="btn btn-primary" id="pr-gerar">' + global.ico('doc', 16) + ' GERAR PROPOSTA</button>',
      aoAbrir: function (m) {
        m.querySelector('#pk-opcoes').addEventListener('click', function (e) {
          var b = e.target.closest('[data-pk]');
          if (!b) return;
          escolhido = pacotes.filter(function (p) { return p.id === b.dataset.pk; })[0];
          m.querySelectorAll('[data-pk]').forEach(function (x) { x.classList.toggle('active', x === b); });
          m.querySelector('#pr-pacote').value = escolhido.nome;
          m.querySelector('#pr-valor').value = escolhido.valor;
          m.querySelector('#pr-prazo').value = escolhido.prazo;
          m.querySelector('#pr-itens').value = escolhido.itens.join('\n');
        });

        m.querySelector('#pr-gerar').addEventListener('click', function () {
          var valor = parseInt(m.querySelector('#pr-valor').value, 10);
          if (!valor || valor < 0) { ui.toast('Informe um valor válido.', 'err'); return; }
          var p = global.Store.criarProposta({
            company_id: c.id,
            pacote: escolhido.id,
            pacote_nome: m.querySelector('#pr-pacote').value.trim() || escolhido.nome,
            valor: valor,
            prazo: m.querySelector('#pr-prazo').value.trim() || escolhido.prazo,
            itens: m.querySelector('#pr-itens').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
            observacoes: m.querySelector('#pr-obs').value.trim(),
            status: 'rascunho'
          });
          ui.fecharModal();
          ui.toast('Proposta gerada.');
          if (typeof aoConcluir === 'function') aoConcluir();
          global.Router.ir('/app/proposta/' + p.id);
        });
      }
    });
  };

  /* ---------------- Documento da proposta ---------------- */
  global.Views.proposta = function (page, params) {
    var ui = global.UI;
    var p = propPorId(params.id);
    if (!p) {
      page.innerHTML = '<div class="card">' + ui.vazio('alert', 'Proposta não encontrada', '',
        '<a href="#/app/propostas" class="btn btn-primary btn-sm">Voltar</a>') + '</div>';
      return;
    }
    var c = global.Store.empresa(p.company_id) || { nome: 'Empresa removida', cidade: '', uf: '' };
    var cfg = global.Store.config();
    var itens = p.itens && p.itens.length
      ? p.itens
      : (global.Store.pacotes().filter(function (x) { return x.id === p.pacote; })[0] || { itens: [] }).itens;
    var st = STATUS[p.status] || STATUS.rascunho;

    page.innerHTML =
      '<div class="page-head no-print">' +
        '<div><h1 class="page-title">Proposta comercial</h1>' +
        '<p class="page-sub">' + ui.esc(c.nome) + ' · emitida em ' + ui.data(p.created_at) + '</p></div>' +
        '<div class="page-actions">' +
          '<a href="#/app/propostas" class="btn btn-ghost">' + global.ico('arrowLeft', 16) + ' Voltar</a>' +
          '<button class="btn btn-ghost" id="pp-copiar">' + global.ico('copy', 16) + ' Copiar resumo</button>' +
          (c.whatsapp || c.telefone
            ? '<button class="btn btn-wa" id="pp-wa">' + global.ico('whatsapp', 16) + ' Enviar no WhatsApp</button>' : '') +
          '<button class="btn btn-primary" id="pp-imprimir">' + global.ico('download', 16) + ' Imprimir / PDF</button>' +
        '</div>' +
      '</div>' +

      '<div class="doc">' +
        '<div class="doc-head">' +
          '<div><h2>Proposta comercial</h2>' +
          '<p style="margin-top:5px;color:#64748b;font-size:13px">Criação de site institucional</p></div>' +
          '<div style="text-align:right">' +
            '<div style="font-weight:800;font-size:15px;font-family:var(--font-display)">' +
              ui.esc(cfg.consultor.empresa || 'SiteHunter AI') + '</div>' +
            (cfg.consultor.nome ? '<div style="font-size:13px;color:#64748b">' + ui.esc(cfg.consultor.nome) + '</div>' : '') +
            (cfg.consultor.telefone ? '<div style="font-size:13px;color:#64748b">' + ui.esc(cfg.consultor.telefone) + '</div>' : '') +
            (cfg.consultor.email ? '<div style="font-size:13px;color:#64748b">' + ui.esc(cfg.consultor.email) + '</div>' : '') +
          '</div>' +
        '</div>' +

        '<h3>Cliente</h3>' +
        '<p><strong>' + ui.esc(c.nome) + '</strong>' +
        (c.razaoSocial ? '<br>' + ui.esc(c.razaoSocial) : '') +
        (c.cnpj ? '<br>CNPJ ' + ui.esc(c.cnpj) : '') +
        (c.cidade ? '<br>' + ui.esc(c.cidade) + (c.uf ? '/' + ui.esc(c.uf) : '') : '') + '</p>' +

        '<h3>Escopo — ' + ui.esc(p.pacote_nome) + '</h3>' +
        '<ul style="padding-left:20px;display:flex;flex-direction:column;gap:7px">' +
          itens.map(function (i) { return '<li>' + ui.esc(i) + '</li>'; }).join('') +
        '</ul>' +

        '<h3>Prazo de entrega</h3>' +
        '<p>' + ui.esc(p.prazo) + ', contados a partir da aprovação da proposta e do envio dos materiais ' +
        '(textos, fotos e logotipo) pelo cliente.</p>' +

        (p.observacoes ? '<h3>Observações</h3><p>' + ui.esc(p.observacoes) + '</p>' : '') +

        '<div class="doc-total"><div><div style="font-size:12px;text-transform:uppercase;letter-spacing:.07em;' +
        'color:#047857;font-weight:700">Investimento total</div>' +
        '<div style="font-size:12.5px;color:#059669;margin-top:2px">Pagamento conforme condição acordada</div></div>' +
        '<div class="tv">' + ui.brlExato(p.valor) + '</div></div>' +

        '<h3>Validade</h3>' +
        '<p>Esta proposta é válida por 15 dias a contar da data de emissão (' + ui.data(p.created_at) + ').</p>' +

        '<p style="margin-top:30px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#94a3b8;line-height:1.6">' +
        'Documento gerado pelo SiteHunter AI. O pagamento online ainda não está integrado nesta instalação — ' +
        'a estrutura de cobrança está preparada em <code>js/integrations.js</code>.</p>' +
      '</div>' +

      '<div class="card section-gap no-print"><div class="card-pad" ' +
        'style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">' +
        '<div><div class="label">Status da proposta</div>' +
        '<span class="badge ' + st.b + ' badge-dot" style="margin-top:6px">' + st.r + '</span></div>' +
        '<button class="btn btn-ghost btn-sm" data-status="' + p.id + '">' + global.ico('edit', 14) + ' Alterar status</button>' +
      '</div></div>';

    var resumo = global.Mensagens.mensagemProposta(c, p);
    page.querySelector('#pp-copiar').addEventListener('click', function () { ui.copiar(resumo, 'Resumo da proposta copiado.'); });
    page.querySelector('#pp-imprimir').addEventListener('click', function () { global.print(); });
    var bw = page.querySelector('#pp-wa');
    if (bw) bw.addEventListener('click', function () {
      global.open(ui.linkWhatsApp(c.whatsapp || c.telefone, resumo), '_blank');
      global.Store.atualizarProposta(p.id, { status: 'enviada' });
      var lead = global.Store.leadDaEmpresa(c.id);
      if (lead) global.Store.moverLead(lead.id, 'proposta');
      ui.toast('Proposta marcada como enviada.');
      global.App.recarregar();
    });
    ui.aoClicar(page, '[data-status]', function (b) { mudarStatus(b.dataset.status); });
  };
})(window);
