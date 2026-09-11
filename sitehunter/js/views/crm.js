/* SiteHunter AI — CRM em Kanban */
(function (global) {
  'use strict';
  global.Views = global.Views || {};

  var filtro = { texto: '', uf: '' };

  global.Views.crm = function (page) {
    var ui = global.UI;
    var estagios = global.Dados.estagios;
    var leads = global.Store.leads();

    var enriquecidos = leads.map(function (l) {
      return { lead: l, empresa: global.Store.empresa(l.company_id) };
    }).filter(function (x) { return !!x.empresa; })
      .filter(function (x) {
        if (filtro.uf && x.empresa.uf !== filtro.uf) return false;
        if (filtro.texto) {
          var t = filtro.texto.toLowerCase();
          return x.empresa.nome.toLowerCase().indexOf(t) !== -1 ||
                 x.empresa.cidade.toLowerCase().indexOf(t) !== -1;
        }
        return true;
      });

    var ativos = enriquecidos.filter(function (x) { return ['fechado', 'perdido'].indexOf(x.lead.estagio) === -1; });
    var emAberto = ativos.reduce(function (s, x) { return s + (x.lead.valor_potencial || 0); }, 0);
    var ganho = enriquecidos.filter(function (x) { return x.lead.estagio === 'fechado'; })
      .reduce(function (s, x) { return s + (x.lead.valor_potencial || 0); }, 0);

    var ufs = {};
    leads.forEach(function (l) {
      var e = global.Store.empresa(l.company_id);
      if (e) ufs[e.uf] = true;
    });

    page.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">CRM</h1>' +
        '<p class="page-sub">Arraste os cards entre as colunas para avançar cada negociação. ' +
        'No celular, use as setas do card.</p></div>' +
        '<div class="page-actions">' +
          '<a href="#/app/radar" class="btn btn-ghost">' + global.ico('plus', 16) + ' Adicionar leads</a>' +
        '</div>' +
      '</div>' +

      '<div class="grid g-kpi">' +
        kpi('Leads ativos', ativos.length, 'users', 'sky') +
        kpi('Em aberto', ui.brl(emAberto), 'money', 'amber') +
        kpi('Fechados', enriquecidos.filter(function (x) { return x.lead.estagio === 'fechado'; }).length, 'handshake', 'emerald') +
        kpi('Potencial dos fechados', ui.brl(ganho), 'trophy', 'emerald') +
      '</div>' +

      '<div class="card section-gap"><div class="card-head">' +
        '<div><div class="card-title">Pipeline de prospecção</div>' +
        '<div class="card-sub">' + enriquecidos.length + ' lead(s) em ' + estagios.length + ' estágios</div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<input class="input" id="crm-busca" placeholder="Filtrar por empresa ou cidade" ' +
            'style="width:auto;min-width:200px" value="' + ui.esc(filtro.texto) + '">' +
          '<select class="select" id="crm-uf" style="width:auto;min-width:120px">' +
            '<option value="">Todos os estados</option>' +
            Object.keys(ufs).sort().map(function (u) {
              return '<option value="' + u + '"' + (filtro.uf === u ? ' selected' : '') + '>' + u + '</option>';
            }).join('') + '</select>' +
        '</div>' +
      '</div>' +
      '<div class="card-pad">' +
        (enriquecidos.length
          ? '<div class="kanban" id="kanban">' + estagios.map(function (e, idx) {
              var doEstagio = enriquecidos.filter(function (x) { return x.lead.estagio === e.id; });
              return coluna(e, doEstagio, idx, estagios.length);
            }).join('') + '</div>'
          : ui.vazio('kanban', 'Seu CRM está vazio',
              'Adicione empresas ao CRM pelo Radar ou pela página de Top Oportunidades para começar a acompanhar suas negociações.',
              '<a href="#/app/radar" class="btn btn-primary btn-sm">Ir para o Radar</a>')) +
      '</div></div>';

    var busca = page.querySelector('#crm-busca');
    var timer;
    busca.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        filtro.texto = busca.value;
        global.App.recarregar();
        var b = document.querySelector('#crm-busca');
        if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); }
      }, 380);
    });
    page.querySelector('#crm-uf').addEventListener('change', function (e) {
      filtro.uf = e.target.value; global.App.recarregar();
    });

    ligarKanban(page);
  };

  function coluna(estagio, itens, idx, total) {
    var ui = global.UI;
    var soma = itens.reduce(function (s, x) { return s + (x.lead.valor_potencial || 0); }, 0);
    return '<section class="kb-col" data-estagio="' + estagio.id + '">' +
      '<header class="kb-head">' +
        '<span class="kb-dot" style="background:' + estagio.cor + '"></span>' +
        '<span class="kb-title">' + ui.esc(estagio.nome) + '</span>' +
        '<span class="kb-count">' + itens.length + '</span>' +
      '</header>' +
      (soma ? '<div style="padding:7px 13px 0;font-size:11.5px;font-weight:650;color:var(--emerald-600)" class="mono">' +
              ui.brl(soma) + '</div>' : '') +
      '<div class="kb-body">' +
        (itens.length ? itens.map(function (x) { return card(x, idx, total); }).join('')
                      : '<div class="kb-empty">Nenhum lead aqui</div>') +
      '</div></section>';
  }

  function card(x, idx, total) {
    var ui = global.UI;
    var c = x.empresa, l = x.lead;
    var f = global.Score.faixa(c.score);
    return '<article class="kb-card" draggable="true" data-lead="' + l.id + '" data-company="' + c.id + '">' +
      '<div style="display:flex;gap:9px;align-items:flex-start">' +
        '<div style="flex:1;min-width:0">' +
          '<div class="kb-card-title truncate">' + ui.esc(c.nome) + '</div>' +
          '<div class="co-sub truncate">' + ui.esc(c.cidade) + '/' + ui.esc(c.uf) + '</div>' +
        '</div>' +
        '<span class="score-badge ' + f.classe + '" style="font-size:13px">' + c.score + '</span>' +
      '</div>' +
      (c.telefone ? '<div class="kb-row">' + global.ico('phone', 12) + '<span class="truncate mono">' +
        ui.esc(c.telefone) + '</span></div>' : '') +
      '<div class="kb-row">' + global.ico('clock', 12) + '<span class="truncate">Último contato: ' +
        ui.esc(l.ultimo_contato ? ui.tempoRelativo(l.ultimo_contato) : 'sem registro') + '</span></div>' +
      (l.proxima_acao ? '<div class="kb-row">' + global.ico('arrowRight', 12) +
        '<span class="truncate" title="' + ui.esc(l.proxima_acao) + '">' + ui.esc(l.proxima_acao) + '</span></div>' : '') +
      '<div class="kb-foot">' +
        '<span class="kb-val">' + ui.brl(l.valor_potencial) + '</span>' +
        '<span style="display:flex;gap:4px">' +
          (c.whatsapp || c.telefone
            ? '<a class="btn btn-ghost btn-sm" href="' + ui.esc(ui.linkWhatsApp(c.whatsapp || c.telefone)) +
              '" target="_blank" rel="noopener" title="WhatsApp" style="padding:4px 7px">' + global.ico('whatsapp', 13) + '</a>'
            : '') +
          '<button class="btn btn-ghost btn-sm" data-abrir="' + l.id + '" title="Detalhes do lead" style="padding:4px 7px">' +
            global.ico('eye', 13) + '</button>' +
        '</span>' +
      '</div>' +
      '<div class="kb-move mobile-only">' +
        '<button data-mover="' + l.id + '" data-dir="-1" ' + (idx === 0 ? 'disabled' : '') + ' aria-label="Estágio anterior">' +
          global.ico('chevronLeft', 13) + '</button>' +
        '<button data-mover="' + l.id + '" data-dir="1" ' + (idx >= total - 1 ? 'disabled' : '') + ' aria-label="Próximo estágio">' +
          global.ico('chevronRight', 13) + '</button>' +
      '</div>' +
    '</article>';
  }

  function kpi(rotulo, valor, icone, cor) {
    var cores = { emerald: ['var(--accent-soft)', 'var(--accent-hover)'], sky: ['var(--sky-soft)', 'var(--sky)'],
                  amber: ['var(--amber-soft)', 'var(--amber)'] }[cor];
    return '<div class="kpi"><div class="kpi-top"><span class="kpi-label">' + global.UI.esc(rotulo) + '</span>' +
      '<span class="kpi-ico" style="background:' + cores[0] + ';color:' + cores[1] + '">' + global.ico(icone, 16) + '</span></div>' +
      '<div class="kpi-value">' + valor + '</div></div>';
  }

  /* ---------- Drag & drop + ações ---------- */
  function ligarKanban(page) {
    var ui = global.UI;
    var kanban = page.querySelector('#kanban');
    if (!kanban) return;
    var arrastando = null;

    kanban.addEventListener('dragstart', function (e) {
      var card = e.target.closest('.kb-card');
      if (!card) return;
      arrastando = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', card.dataset.lead); } catch (err) { /* IE legado */ }
    });

    kanban.addEventListener('dragend', function () {
      if (arrastando) arrastando.classList.remove('dragging');
      arrastando = null;
      kanban.querySelectorAll('.kb-col').forEach(function (c) { c.classList.remove('drag-over'); });
    });

    kanban.querySelectorAll('.kb-col').forEach(function (col) {
      col.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
      });
      col.addEventListener('dragleave', function (e) {
        if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
      });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('drag-over');
        var leadId = arrastando ? arrastando.dataset.lead : null;
        try { leadId = leadId || e.dataTransfer.getData('text/plain'); } catch (err) { /* noop */ }
        if (!leadId) return;
        mover(leadId, col.dataset.estagio);
      });
    });

    ui.aoClicar(page, '[data-mover]', function (b) {
      if (b.disabled) return;
      var lead = global.Store.leads().filter(function (l) { return l.id === b.dataset.mover; })[0];
      if (!lead) return;
      var estagios = global.Dados.estagios;
      var i = estagios.findIndex(function (e) { return e.id === lead.estagio; });
      var novo = estagios[i + parseInt(b.dataset.dir, 10)];
      if (novo) mover(lead.id, novo.id);
    });

    ui.aoClicar(page, '[data-abrir]', function (b) { detalheLead(b.dataset.abrir); });

    kanban.addEventListener('dblclick', function (e) {
      var card = e.target.closest('.kb-card');
      if (card) detalheLead(card.dataset.lead);
    });
  }

  function mover(leadId, estagio) {
    var r = global.Store.moverLead(leadId, estagio);
    if (!r) return;
    var emp = global.Store.empresa(r.company_id);
    global.UI.toast((emp ? emp.nome : 'Lead') + ' → ' + global.Store.rotuloEstagio(estagio));
    global.App.recarregar();
  }

  /* ---------- Detalhe do lead ---------- */
  function detalheLead(leadId) {
    var ui = global.UI;
    var lead = global.Store.leads().filter(function (l) { return l.id === leadId; })[0];
    if (!lead) return;
    var c = global.Store.empresa(lead.company_id);
    if (!c) return;
    var eventos = global.Store.eventos(c.id).slice(0, 6);

    ui.modal({
      titulo: c.nome,
      subtitulo: c.cidade + '/' + c.uf + ' · ' + c.segmento,
      largo: true,
      corpo:
        '<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px">' +
          '<div>' +
            '<div class="field" style="margin-bottom:14px"><label class="label" for="ld-estagio">Estágio</label>' +
            '<select class="select" id="ld-estagio">' + global.Dados.estagios.map(function (e) {
              return '<option value="' + e.id + '"' + (e.id === lead.estagio ? ' selected' : '') + '>' + ui.esc(e.nome) + '</option>';
            }).join('') + '</select></div>' +
            '<div class="field" style="margin-bottom:14px"><label class="label" for="ld-valor">Valor potencial (R$)</label>' +
            '<input class="input mono" type="number" id="ld-valor" min="0" step="10" value="' + (lead.valor_potencial || 0) + '"></div>' +
            '<div class="field" style="margin-bottom:14px"><label class="label" for="ld-acao">Próxima ação</label>' +
            '<input class="input" id="ld-acao" value="' + ui.esc(lead.proxima_acao || '') + '"></div>' +
            '<div class="field"><label class="label" for="ld-notas">Anotações</label>' +
            '<textarea class="textarea" id="ld-notas" placeholder="Registre o que foi conversado…">' +
            ui.esc(lead.notas || '') + '</textarea></div>' +
          '</div>' +
          '<div>' +
            '<div class="card" style="box-shadow:none"><div class="card-pad">' +
              '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">' +
                ui.scoreAnel(c.score, 96) +
                '<div><div class="label">Score de oportunidade</div>' +
                '<div style="font-size:13px;font-weight:650;margin-top:3px">' + ui.esc(c.scoreFaixa) + '</div>' +
                '<div class="hint" style="margin-top:5px">Presença digital: ' + c.presenca.indice + '/100</div></div>' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:2px">' +
                linhaInfo('phone', 'Telefone', c.telefone) +
                linhaInfo('whatsapp', 'WhatsApp', c.whatsapp) +
                linhaInfo('mail', 'E-mail', c.email) +
                linhaInfo('globe', 'Website', c.website || 'Não encontrado') +
                linhaInfo('clock', 'Último contato', lead.ultimo_contato ? ui.data(lead.ultimo_contato, true) : 'Sem registro') +
              '</div>' +
            '</div></div>' +
            (eventos.length
              ? '<div style="margin-top:16px"><div class="label" style="margin-bottom:10px">Últimas movimentações</div>' +
                '<div class="timeline">' + eventos.map(function (e) {
                  return '<div class="tl-item" style="padding-bottom:13px">' +
                    '<span class="tl-dot" style="background:var(--surface-2);color:var(--text-muted)">' +
                    global.ico('arrowRight', 13) + '</span>' +
                    '<div><div class="tl-title" style="font-size:12.5px">' + ui.esc(e.descricao) + '</div>' +
                    '<div class="tl-time">' + ui.tempoRelativo(e.created_at) + '</div></div></div>';
                }).join('') + '</div></div>'
              : '') +
          '</div>' +
        '</div>',
      rodape:
        '<button class="btn btn-danger btn-sm" id="ld-remover">' + global.ico('trash', 15) + ' Remover do CRM</button>' +
        '<a class="btn btn-ghost" href="#/app/empresa/' + c.id + '" data-fechar>' + global.ico('eye', 15) + ' Ver empresa</a>' +
        '<button class="btn btn-ghost" id="ld-msg">' + global.ico('sparkles', 15) + ' Abordagem</button>' +
        '<button class="btn btn-primary" id="ld-salvar">Salvar</button>',
      aoAbrir: function (m) {
        m.querySelector('#ld-salvar').addEventListener('click', function () {
          var novoEstagio = m.querySelector('#ld-estagio').value;
          global.Store.atualizarLead(lead.id, {
            valor_potencial: parseInt(m.querySelector('#ld-valor').value, 10) || 0,
            proxima_acao: m.querySelector('#ld-acao').value.trim(),
            notas: m.querySelector('#ld-notas').value
          });
          if (novoEstagio !== lead.estagio) global.Store.moverLead(lead.id, novoEstagio);
          ui.fecharModal();
          ui.toast('Lead atualizado.');
          global.App.recarregar();
        });
        m.querySelector('#ld-msg').addEventListener('click', function () {
          ui.fecharModal();
          global.Acoes.gerarAbordagem(c.id);
        });
        m.querySelector('#ld-remover').addEventListener('click', function () {
          ui.fecharModal();
          ui.confirmar('Remover do CRM',
            'O lead de ' + c.nome + ' será removido do pipeline. A empresa continua na base do Radar.',
            function () {
              global.Store.removerLead(lead.id);
              ui.toast('Lead removido do CRM.', 'info');
              global.App.recarregar();
            }, 'Remover', true);
        });
      }
    });
  }

  function linhaInfo(icone, rotulo, valor) {
    var ui = global.UI;
    return '<div class="audit-row" style="padding:9px 0">' +
      '<div class="audit-k" style="font-size:12.5px;color:var(--text-muted)">' + global.ico(icone, 14) + ' ' + ui.esc(rotulo) + '</div>' +
      '<span style="font-size:12.5px;font-weight:600;text-align:right">' + ui.esc(valor || 'Não informado') + '</span></div>';
  }
})(window);
