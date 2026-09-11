/* SiteHunter AI — Detalhe da empresa + ações compartilhadas (demo, abordagem, proposta) */
(function (global) {
  'use strict';
  global.Views = global.Views || {};

  /* =========================================================
     AÇÕES COMPARTILHADAS — usadas pelo Radar, CRM, Oportunidades e Detalhe
     ========================================================= */
  var Acoes = {

    /* ---- Criar site demonstração ---- */
    criarDemo: function (companyId, aoConcluir) {
      var ui = global.UI;
      var c = global.Store.empresa(companyId);
      if (!c) { ui.toast('Empresa não encontrada.', 'err'); return; }

      var existente = global.Store.demoDaEmpresa(companyId);
      if (existente) { Acoes.demoPronta(existente, c, aoConcluir); return; }

      var faltando = [];
      if (!c.telefone && !c.whatsapp) faltando.push('telefone ou WhatsApp');
      if (!c.servicos || !c.servicos.length) faltando.push('lista de serviços');
      if (!c.endereco) faltando.push('endereço');

      ui.modal({
        titulo: 'Criar site demonstração',
        subtitulo: c.nome,
        corpo:
          '<p style="font-size:13.5px;color:var(--text-soft);line-height:1.65;margin-bottom:16px">' +
          'A demonstração é montada apenas com os dados já cadastrados desta empresa. ' +
          'Nenhum serviço, avaliação ou informação será inventado — o que faltar aparece como campo a preencher.</p>' +
          '<div class="card" style="box-shadow:none"><div class="card-pad">' +
            '<div class="data-list">' +
              dado('Nome', c.nome) + dado('Segmento', c.segmento) +
              dado('Cidade', c.cidade + '/' + c.uf) + dado('Telefone', c.telefone) +
              dado('WhatsApp', c.whatsapp) + dado('Endereço', c.endereco) +
              dado('Serviços mapeados', c.servicos && c.servicos.length ? c.servicos.length + ' serviços' : null) +
            '</div>' +
          '</div></div>' +
          (faltando.length
            ? '<div style="margin-top:14px;padding:13px 15px;background:var(--amber-soft);color:var(--amber);' +
              'border-radius:var(--r);font-size:12.5px;line-height:1.6">' + global.ico('info', 15) +
              ' Sem ' + ui.esc(faltando.join(', ')) + '. Essas seções ficarão como campos a preencher na demonstração.</div>'
            : '') +
          '<div id="demo-prog" hidden style="margin-top:18px">' +
            '<div class="progress"><i id="demo-bar" style="width:0%"></i></div>' +
            '<p class="hint" style="margin-top:9px" id="demo-passo">Preparando…</p>' +
          '</div>',
        rodape: '<button class="btn btn-ghost" data-fechar>Cancelar</button>' +
                '<button class="btn btn-primary" id="demo-go">' + global.ico('layout', 16) + ' CRIAR SITE DEMONSTRAÇÃO</button>',
        aoAbrir: function (m) {
          m.querySelector('#demo-go').addEventListener('click', function () {
            var bt = m.querySelector('#demo-go');
            bt.disabled = true;
            bt.innerHTML = '<span class="spinner"></span> Gerando…';
            m.querySelector('#demo-prog').hidden = false;
            var passos = ['Lendo dados cadastrais…', 'Montando estrutura das seções…',
                          'Aplicando identidade do segmento…', 'Finalizando demonstração…'];
            var i = 0;
            var t = setInterval(function () {
              m.querySelector('#demo-bar').style.width = ((i + 1) / passos.length * 100) + '%';
              m.querySelector('#demo-passo').textContent = passos[i];
              i++;
              if (i >= passos.length) {
                clearInterval(t);
                setTimeout(function () {
                  var d = global.Store.criarDemo(companyId, 'institucional');
                  ui.fecharModal();
                  Acoes.demoPronta(d, c, aoConcluir);
                }, 260);
              }
            }, 330);
          });
        }
      });
    },

    demoPronta: function (demo, c, aoConcluir) {
      var ui = global.UI;
      var url = global.SiteDemo.urlPublica(demo, c);
      ui.modal({
        titulo: 'Demonstração criada',
        subtitulo: c.nome,
        corpo:
          '<div style="display:flex;gap:13px;align-items:flex-start;padding:15px 17px;background:var(--accent-soft);' +
          'border-radius:var(--r-md);margin-bottom:18px">' +
            '<span style="color:var(--accent-hover)">' + global.ico('checkCircle', 20) + '</span>' +
            '<div><div style="font-weight:700;font-size:14px;color:var(--accent-hover)">Demonstração pronta</div>' +
            '<p style="font-size:13px;color:var(--accent-hover);opacity:.88;margin-top:3px;line-height:1.55">' +
            'A página foi montada com os dados de ' + ui.esc(c.nome) + ' e já traz o selo de demonstração.</p></div>' +
          '</div>' +
          '<div class="field"><label class="label">Link da demonstração</label>' +
          '<input class="input mono" id="demo-url" readonly value="' + ui.esc(url) + '" style="font-size:12.5px"></div>' +
          '<p class="hint" style="margin-top:9px">Enquanto a hospedagem própria não estiver conectada, ' +
          'o link abre a demonstração dentro do aplicativo. Veja <code>js/integrations.js</code>.</p>',
        rodape:
          '<button class="btn btn-ghost" id="d-copiar">' + global.ico('copy', 15) + ' COPIAR LINK</button>' +
          '<button class="btn btn-ghost" id="d-editar">' + global.ico('edit', 15) + ' EDITAR</button>' +
          '<button class="btn btn-ghost" id="d-enviar">' + global.ico('send', 15) + ' ENVIAR PARA CLIENTE</button>' +
          '<button class="btn btn-primary" id="d-ver">' + global.ico('external', 15) + ' VISUALIZAR</button>',
        aoAbrir: function (m) {
          m.querySelector('#d-ver').addEventListener('click', function () { global.SiteDemo.abrir(c); });
          m.querySelector('#d-copiar').addEventListener('click', function () { ui.copiar(url, 'Link da demonstração copiado.'); });
          m.querySelector('#d-editar').addEventListener('click', function () {
            ui.fecharModal();
            global.Router.ir('/app/empresa/' + c.id + '?aba=dados');
            ui.toast('Ajuste os dados da empresa — a demonstração é regenerada a partir deles.', 'info');
          });
          m.querySelector('#d-enviar').addEventListener('click', function () {
            ui.fecharModal();
            Acoes.enviarDemo(demo, c);
          });
        }
      });
      if (typeof aoConcluir === 'function') aoConcluir();
    },

    enviarDemo: function (demo, c) {
      var ui = global.UI;
      var url = global.SiteDemo.urlPublica(demo, c);
      var texto = global.Mensagens.mensagemEnvioDemo(c, url);
      ui.modal({
        titulo: 'Enviar demonstração para o cliente',
        subtitulo: c.nome,
        corpo:
          '<div class="msg-box" id="env-txt">' + ui.esc(texto) + '</div>' +
          (global.Store.estaOptOut(ui.soDigitos(c.whatsapp || c.telefone))
            ? '<div style="margin-top:13px;padding:12px 14px;background:var(--rose-soft);color:var(--rose);' +
              'border-radius:var(--r);font-size:12.5px">Este contato pediu para não receber comunicações. ' +
              'O envio está bloqueado por opt-out.</div>'
            : '<p class="hint" style="margin-top:12px">O envio é feito por você, no seu próprio WhatsApp ou e-mail. ' +
              'Nada é disparado automaticamente.</p>'),
        rodape:
          '<button class="btn btn-ghost" id="e-copiar">' + global.ico('copy', 15) + ' Copiar</button>' +
          (c.email ? '<button class="btn btn-ghost" id="e-email">' + global.ico('mail', 15) + ' E-mail</button>' : '') +
          (c.whatsapp || c.telefone
            ? '<button class="btn btn-wa" id="e-wa">' + global.ico('whatsapp', 15) + ' Abrir WhatsApp</button>'
            : ''),
        aoAbrir: function (m) {
          m.querySelector('#e-copiar').addEventListener('click', function () { ui.copiar(texto); });
          var be = m.querySelector('#e-email');
          if (be) be.addEventListener('click', function () {
            global.Integracoes.email.abrirCliente(c.email, 'Demonstração do site — ' + c.nome, texto);
          });
          var bw = m.querySelector('#e-wa');
          if (bw) bw.addEventListener('click', function () {
            var alvo = c.whatsapp || c.telefone;
            if (global.Store.estaOptOut(ui.soDigitos(alvo))) {
              ui.toast('Contato em opt-out. Envio bloqueado.', 'err'); return;
            }
            global.open(ui.linkWhatsApp(alvo, texto), '_blank');
            global.Store.marcarDemoEnviada(demo.id);
            global.Store.registrarMensagem(c.id, 'envio_demo', texto, 'whatsapp');
            var lead = global.Store.leadDaEmpresa(c.id);
            if (lead && ['novo', 'analisado', 'demo'].indexOf(lead.estagio) !== -1) {
              global.Store.moverLead(lead.id, 'contatado');
            }
            ui.fecharModal();
            ui.toast('Demonstração marcada como enviada e lead movido para CONTATADO.');
            global.App.recarregar();
          });
        }
      });
    },

    /* ---- Gerador de abordagem ---- */
    gerarAbordagem: function (companyId) {
      var ui = global.UI;
      var c = global.Store.empresa(companyId);
      if (!c) { ui.toast('Empresa não encontrada.', 'err'); return; }
      var estilo = 'consultivo', variacao = 0;

      function texto() { return global.Mensagens.gerar(c, estilo, variacao); }

      ui.modal({
        titulo: 'Gerar abordagem',
        subtitulo: c.nome + ' · ' + c.cidade + '/' + c.uf,
        corpo:
          '<div class="field" style="margin-bottom:16px"><label class="label">Estilo da mensagem</label>' +
          '<div class="style-grid" id="estilos">' + global.Mensagens.estilos.map(function (e) {
            return '<button class="style-btn ' + (e.id === estilo ? 'active' : '') + '" data-estilo="' + e.id + '">' +
              ui.esc(e.nome) + '</button>';
          }).join('') + '</div></div>' +
          '<div class="msg-box" id="msg-txt">' + ui.esc(texto()) + '</div>' +
          '<p class="hint" style="margin-top:12px">' + global.ico('shield', 13) +
          ' A mensagem usa apenas dados cadastrados desta empresa. Revise antes de enviar.</p>',
        rodape:
          '<button class="btn btn-ghost" id="m-outra">' + global.ico('refresh', 15) + ' GERAR OUTRA</button>' +
          '<button class="btn btn-ghost" id="m-copiar">' + global.ico('copy', 15) + ' COPIAR</button>' +
          (c.whatsapp || c.telefone
            ? '<button class="btn btn-wa" id="m-wa">' + global.ico('whatsapp', 15) + ' ABRIR WHATSAPP</button>'
            : '<button class="btn btn-ghost" disabled>Sem telefone cadastrado</button>'),
        aoAbrir: function (m) {
          function repintar() {
            m.querySelector('#msg-txt').textContent = texto();
            m.querySelectorAll('[data-estilo]').forEach(function (b) {
              b.classList.toggle('active', b.dataset.estilo === estilo);
            });
          }
          m.querySelector('#estilos').addEventListener('click', function (e) {
            var b = e.target.closest('[data-estilo]');
            if (!b) return;
            estilo = b.dataset.estilo; variacao = 0; repintar();
          });
          m.querySelector('#m-outra').addEventListener('click', function () { variacao++; repintar(); });
          m.querySelector('#m-copiar').addEventListener('click', function () {
            ui.copiar(texto(), 'Abordagem copiada.');
            global.Store.registrarMensagem(c.id, estilo, texto(), 'copia');
          });
          var bw = m.querySelector('#m-wa');
          if (bw) bw.addEventListener('click', function () {
            var alvo = c.whatsapp || c.telefone;
            if (global.Store.estaOptOut(ui.soDigitos(alvo))) {
              ui.toast('Contato em opt-out. Envio bloqueado.', 'err'); return;
            }
            global.open(ui.linkWhatsApp(alvo, texto()), '_blank');
            global.Store.registrarMensagem(c.id, estilo, texto(), 'whatsapp');
            var lead = global.Store.leadDaEmpresa(c.id);
            if (lead && ['novo', 'analisado', 'demo'].indexOf(lead.estagio) !== -1) {
              global.Store.moverLead(lead.id, 'contatado');
              ui.toast('Lead movido para CONTATADO.');
            }
            ui.fecharModal();
            global.App.recarregar();
          });
        }
      });
    },

    adicionarAoCrm: function (companyId, aoConcluir) {
      var r = global.Store.criarLead(companyId, 'novo');
      if (!r.ok) { global.UI.toast(r.erro, 'err'); return; }
      global.UI.toast('Empresa adicionada ao CRM em NOVO LEAD.');
      if (typeof aoConcluir === 'function') aoConcluir();
    }
  };

  global.Acoes = Acoes;

  function dado(k, v) {
    return '<div class="data-item"><div class="data-k">' + global.UI.esc(k) + '</div>' +
      '<div class="data-v' + (v ? '' : ' muted') + '">' + global.UI.esc(v || 'Não informado') + '</div></div>';
  }

  /* =========================================================
     DETALHE DA EMPRESA
     ========================================================= */
  global.Views.empresa = function (page, params, query) {
    var ui = global.UI;
    var c = global.Store.empresa(params.id);

    if (!c) {
      page.innerHTML = '<div class="card">' + ui.vazio('alert', 'Empresa não encontrada',
        'O registro solicitado não existe nesta base.',
        '<a href="#/app/radar" class="btn btn-primary btn-sm">Voltar ao Radar</a>') + '</div>';
      return;
    }

    var aud = global.Store.auditoria(c.id) || {};
    var lead = global.Store.leadDaEmpresa(c.id);
    var demo = global.Store.demoDaEmpresa(c.id);
    var f = global.Score.faixa(c.score);
    var aba = (query && query.aba) || 'diagnostico';

    page.innerHTML =
      '<div style="margin-bottom:16px"><a href="#/app/radar" class="btn btn-ghost btn-sm">' +
        global.ico('arrowLeft', 14) + ' Voltar ao Radar</a></div>' +

      '<div class="card"><div class="card-pad">' +
        '<div class="co-hero">' +
          ui.logoEmpresa(c.nome, 'co-hero-logo') +
          '<div style="flex:1;min-width:220px">' +
            '<h1 class="page-title" style="font-size:22px">' + ui.esc(c.nome) + '</h1>' +
            '<p class="page-sub" style="margin-top:5px">' + ui.esc(c.razaoSocial || '') + '</p>' +
            '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:11px">' +
              '<span class="badge badge-gray">' + global.ico('building', 12) + ' ' + ui.esc(c.segmento) + '</span>' +
              '<span class="badge badge-gray">' + global.ico('mapPin', 12) + ' ' + ui.esc(c.cidade) + '/' + ui.esc(c.uf) + '</span>' +
              '<span class="badge ' + ((c.situacao || '').toUpperCase() === 'ATIVA' ? 'badge-emerald' : 'badge-rose') + ' badge-dot">' +
                ui.esc(c.situacao || '—') + '</span>' +
              (lead ? '<span class="badge badge-violet badge-dot">CRM: ' + ui.esc(global.Store.rotuloEstagio(lead.estagio)) + '</span>' : '') +
              (demo ? '<span class="badge badge-sky badge-dot">Demonstração criada</span>' : '') +
            '</div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:9px">' +
            ui.scoreAnel(c.score) +
            '<span class="badge ' + f.badge + ' badge-dot">' + ui.esc(f.nome) + '</span>' +
          '</div>' +
        '</div>' +

        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px;padding-top:18px;border-top:1px solid var(--border)">' +
          '<button class="btn btn-primary" data-demo="' + c.id + '">' + global.ico('layout', 16) + ' ' +
            (demo ? 'VER SITE DEMONSTRAÇÃO' : 'CRIAR SITE DEMONSTRAÇÃO') + '</button>' +
          '<button class="btn btn-ghost" data-msg="' + c.id + '">' + global.ico('sparkles', 16) + ' GERAR ABORDAGEM</button>' +
          '<button class="btn ' + (lead ? 'btn-ghost' : 'btn-soft') + '" data-crm="' + c.id + '" ' + (lead ? 'disabled' : '') + '>' +
            global.ico(lead ? 'check' : 'plus', 16) + ' ' + (lead ? 'JÁ ESTÁ NO CRM' : 'ADICIONAR AO CRM') + '</button>' +
          '<button class="btn btn-ghost" data-prop="' + c.id + '">' + global.ico('doc', 16) + ' GERAR PROPOSTA</button>' +
          (c.whatsapp || c.telefone
            ? '<a class="btn btn-wa" href="' + ui.esc(ui.linkWhatsApp(c.whatsapp || c.telefone)) +
              '" target="_blank" rel="noopener">' + global.ico('whatsapp', 16) + ' WHATSAPP</a>'
            : '') +
        '</div>' +
      '</div></div>' +

      '<div class="section-gap"><div class="tabs">' +
        [['diagnostico', 'Diagnóstico digital'], ['score', 'Por que este score?'],
         ['dados', 'Dados cadastrais'], ['historico', 'Histórico']].map(function (t) {
          return '<button class="tab ' + (aba === t[0] ? 'active' : '') + '" data-aba="' + t[0] + '">' + t[1] + '</button>';
        }).join('') +
      '</div><div id="aba-conteudo"></div></div>';

    function pintarAba() {
      var el = page.querySelector('#aba-conteudo');
      if (aba === 'score') el.innerHTML = abaScore(c);
      else if (aba === 'dados') el.innerHTML = abaDados(c);
      else if (aba === 'historico') el.innerHTML = abaHistorico(c);
      else el.innerHTML = abaDiagnostico(c, aud);
      page.querySelectorAll('.tab').forEach(function (t) {
        t.classList.toggle('active', t.dataset.aba === aba);
      });
      var bEditar = el.querySelector('#editar-emp');
      if (bEditar) bEditar.addEventListener('click', function () { editarEmpresa(c); });
    }
    pintarAba();

    ui.aoClicar(page, '[data-aba]', function (b) { aba = b.dataset.aba; pintarAba(); });

    ui.aoClicar(page, '[data-demo]', function () {
      if (demo) { Acoes.demoPronta(demo, c); return; }
      Acoes.criarDemo(c.id, function () { global.App.recarregar(); });
    });
    ui.aoClicar(page, '[data-msg]', function () { Acoes.gerarAbordagem(c.id); });
    ui.aoClicar(page, '[data-crm]', function (b) {
      if (b.disabled) return;
      Acoes.adicionarAoCrm(c.id, function () { global.App.recarregar(); });
    });
    ui.aoClicar(page, '[data-prop]', function () {
      global.Views.abrirGeradorProposta(c.id, function () { global.App.recarregar(); });
    });
  };

  /* ---------- Abas ---------- */
  function abaDiagnostico(c, aud) {
    var ui = global.UI;
    var p = c.presenca;
    return '<div class="grid" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)">' +
      '<div class="card"><div class="card-head"><div>' +
        '<div class="card-title">Diagnóstico digital</div>' +
        '<div class="card-sub">Canais verificados nos dados disponíveis</div></div>' +
        '<span class="badge badge-gray">' + p.indice + '/100 de presença</span></div>' +
      '<div class="card-pad">' +
        p.itens.map(function (i) {
          var ok = i.estado === 'ok', meio = i.estado === 'fraco';
          var cor = ok ? ['var(--accent-soft)', 'var(--accent-hover)']
                       : meio ? ['var(--amber-soft)', 'var(--amber)']
                              : ['var(--rose-soft)', 'var(--rose)'];
          return '<div class="audit-row">' +
            '<div class="audit-k"><span class="audit-ico" style="background:' + cor[0] + ';color:' + cor[1] + '">' +
            global.ico(ok ? 'check' : (meio ? 'alert' : 'x'), 15) + '</span>' +
            ui.esc(i.rotulo) + '</div>' +
            '<div style="text-align:right"><div style="font-size:12.5px;font-weight:650;color:' + cor[1] + '">' +
            (ok ? 'Encontrado' : meio ? 'Encontrado, porém fraco' : 'Nenhum encontrado') + '</div>' +
            '<div class="co-sub mono">' + i.pts + ' de ' + i.max + ' pts</div></div></div>';
        }).join('') +
        '<div style="margin-top:18px"><div class="label" style="margin-bottom:7px">Presença digital</div>' +
        '<div class="progress"><i style="width:' + p.indice + '%"></i></div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:7px">' +
        '<span class="hint">Quanto menor, maior a oportunidade</span>' +
        '<span class="mono" style="font-weight:750;font-size:13px">' + p.indice + '/100</span></div></div>' +
      '</div></div>' +

      '<div style="display:flex;flex-direction:column;gap:16px">' +
        '<div class="card"><div class="card-head"><div class="card-title">Recomendação</div></div>' +
        '<div class="card-pad"><div class="rec-box">' + global.ico('sparkles', 18) +
          '<p>' + ui.esc(p.recomendacao) + '</p></div>' +
          '<p class="hint" style="margin-top:13px">Fonte da análise: ' +
          ui.esc((aud && aud.fonte) || 'dados cadastrais e canais públicos') + '.</p>' +
        '</div></div>' +

        '<div class="card"><div class="card-head"><div class="card-title">Canais de contato</div></div>' +
        '<div class="card-pad"><div style="display:flex;flex-direction:column;gap:2px">' +
          contato('phone', 'Telefone', c.telefone, c.telefone ? 'tel:' + ui.soDigitos(c.telefone) : null) +
          contato('whatsapp', 'WhatsApp', c.whatsapp, c.whatsapp ? ui.linkWhatsApp(c.whatsapp) : null) +
          contato('mail', 'E-mail', c.email, c.email ? 'mailto:' + c.email : null) +
          contato('globe', 'Website', c.website ? (c.siteFraco ? c.website + ' (qualidade fraca)' : c.website) : null,
                  c.website ? 'https://' + c.website : null) +
          contato('instagram', 'Instagram', c.instagram,
                  c.instagram ? 'https://instagram.com/' + String(c.instagram).replace('@', '') : null) +
          contato('facebook', 'Facebook', c.facebook,
                  c.facebook ? 'https://facebook.com/' + c.facebook : null) +
          contato('mapPin', 'Google Meu Negócio', c.googleBusiness ? 'Perfil ativo' : null, null) +
        '</div></div></div>' +

        '<div class="card"><div class="card-pad" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">' +
          '<div><div class="label">Valor potencial estimado</div>' +
          '<div class="kpi-value" style="color:var(--emerald-600);font-size:24px">' + ui.brl(c.valorPotencial) + '</div>' +
          '<div class="hint" style="margin-top:4px">Derivado do score e do porte cadastrado</div></div>' +
          '<button class="btn btn-soft" data-prop="' + c.id + '">' + global.ico('doc', 16) + ' Gerar proposta</button>' +
        '</div></div>' +
      '</div></div>';
  }

  function contato(icone, rotulo, valor, href) {
    var ui = global.UI;
    var ok = !!valor;
    return '<div class="audit-row">' +
      '<div class="audit-k"><span class="audit-ico" style="background:' +
        (ok ? 'var(--accent-soft);color:var(--accent-hover)' : 'var(--surface-2);color:var(--text-muted)') + '">' +
        global.ico(icone, 15) + '</span>' + ui.esc(rotulo) + '</div>' +
      (ok
        ? (href ? '<a class="link" href="' + ui.esc(href) + '" target="_blank" rel="noopener" style="font-size:13px">' +
                  ui.esc(valor) + '</a>'
                : '<span style="font-size:13px;font-weight:550">' + ui.esc(valor) + '</span>')
        : '<span class="muted" style="font-size:12.5px">Não encontrado</span>') +
    '</div>';
  }

  function abaScore(c) {
    var ui = global.UI;
    var f = global.Score.faixa(c.score);
    return '<div class="grid" style="grid-template-columns:minmax(0,300px) minmax(0,1fr)">' +
      '<div class="card"><div class="card-pad" style="display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">' +
        ui.scoreAnel(c.score, 156) +
        '<span class="badge ' + f.badge + ' badge-dot">' + ui.esc(f.nome) + '</span>' +
        '<div style="width:100%;text-align:left;border-top:1px solid var(--border);padding-top:14px">' +
          '<div class="label" style="margin-bottom:9px">Faixas de classificação</div>' +
          [['90–100', 'Oportunidade excepcional', 90], ['75–89', 'Alta oportunidade', 75],
           ['60–74', 'Boa oportunidade', 60], ['40–59', 'Média oportunidade', 40],
           ['0–39', 'Baixa oportunidade', 0]].map(function (x) {
            var ativa = c.score >= x[2] && (x[2] === 90 ? true : c.score < proximaFaixa(x[2]));
            return '<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:12.5px;' +
              (ativa ? 'font-weight:700;color:var(--text)' : 'color:var(--text-muted)') + '">' +
              '<span class="mono">' + x[0] + '</span><span>' + x[1] + '</span></div>';
          }).join('') +
        '</div>' +
      '</div></div>' +

      '<div class="card"><div class="card-head"><div>' +
        '<div class="card-title">Por que essa empresa recebeu este score?</div>' +
        '<div class="card-sub">Cada ponto atribuído tem uma justificativa verificável</div></div></div>' +
      '<div class="card-pad"><div class="score-why">' +
        c.scoreDetalhes.map(function (d) {
          var pos = d.pts > 0;
          return '<div class="why-row">' +
            '<span class="why-pts ' + (pos ? 'pos' : 'neu') + '">' + (pos ? '+' + formatarPts(d.pts) : '0') + '</span>' +
            '<span class="why-txt">' + ui.esc(d.texto) +
            (pos && d.pts < d.max ? ' <span class="muted">(de ' + d.max + ' possíveis)</span>' : '') +
            '</span></div>';
        }).join('') +
        '<div class="why-row" style="border-top:2px solid var(--border);border-bottom:0;margin-top:8px;padding-top:13px">' +
        '<span class="why-pts pos" style="font-size:15px">' + c.score + '</span>' +
        '<span class="why-txt" style="font-weight:700;color:var(--text)">Score final de oportunidade</span></div>' +
      '</div>' +
      '<p class="hint" style="margin-top:16px">' + global.ico('info', 13) +
      ' O motor de score está em <code>js/score.js</code> e pode ser ajustado sem alterar nenhuma tela.</p>' +
      '</div></div></div>';
  }

  function proximaFaixa(min) {
    return { 0: 40, 40: 60, 60: 75, 75: 90, 90: 101 }[min];
  }

  function formatarPts(n) {
    return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
  }

  function abaDados(c) {
    var ui = global.UI;
    return '<div class="card"><div class="card-head"><div>' +
      '<div class="card-title">Dados cadastrais</div>' +
      '<div class="card-sub">Origem: ' + ui.esc(c.origem || 'Base de demonstração') + '</div></div>' +
      '<button class="btn btn-ghost btn-sm" id="editar-emp">' + global.ico('edit', 14) + ' Editar</button>' +
      '</div><div class="card-pad"><div class="data-list">' +
        dado('Nome fantasia', c.nome) +
        dado('Razão social', c.razaoSocial) +
        dado('CNPJ', c.cnpj) +
        dado('CNAE principal', c.cnae ? c.cnae + ' — ' + (c.cnaeDesc || '') : null) +
        dado('Data de abertura', c.abertura ? ui.data(c.abertura) : null) +
        dado('Situação cadastral', c.situacao) +
        dado('Porte', c.porte) +
        dado('Segmento', c.segmento) +
        dado('Endereço', c.endereco) +
        dado('Bairro', c.bairro) +
        dado('Cidade', c.cidade) +
        dado('Estado', c.uf) +
        dado('CEP', c.cep) +
        dado('Telefone', c.telefone) +
        dado('WhatsApp', c.whatsapp) +
        dado('E-mail', c.email) +
        dado('Website', c.website) +
        dado('Instagram', c.instagram) +
        dado('Facebook', c.facebook) +
        dado('Google Meu Negócio', c.googleBusiness ? 'Perfil ativo' : null) +
        dado('Encontrada em', c.descoberto_em ? ui.data(c.descoberto_em, true) : null) +
      '</div>' +
      (c.servicos && c.servicos.length
        ? '<div style="margin-top:20px"><div class="label" style="margin-bottom:9px">Serviços mapeados</div>' +
          '<div style="display:flex;gap:7px;flex-wrap:wrap">' + c.servicos.map(function (s) {
            return '<span class="badge badge-gray">' + ui.esc(s) + '</span>';
          }).join('') + '</div></div>'
        : '<p class="hint" style="margin-top:18px">Nenhum serviço mapeado. Edite a empresa para incluir a lista — ' +
          'ela é usada na geração do site demonstração.</p>') +
      '<p class="hint" style="margin-top:18px">' + global.ico('shield', 13) +
      ' Empresa da base de demonstração. Para solicitar correção ou remoção de um registro real, ' +
      'consulte <a href="#/legal/remocao" class="link">Remoção e opt-out</a>.</p>' +
      '</div></div>';
  }

  /* ---------- Edição de empresa ---------- */
  function editarEmpresa(c) {
    var ui = global.UI;
    function campo(id, rotulo, valor, tipo) {
      return '<div class="field"><label class="label" for="' + id + '">' + rotulo + '</label>' +
        '<input class="input" type="' + (tipo || 'text') + '" id="' + id + '" value="' + ui.esc(valor || '') + '"></div>';
    }
    ui.modal({
      titulo: 'Editar empresa',
      subtitulo: c.nome,
      largo: true,
      corpo:
        '<p class="hint" style="margin-bottom:16px">Ao salvar, o score de oportunidade e o diagnóstico ' +
        'digital são recalculados com os novos dados.</p>' +
        '<div class="filters">' +
          campo('ed-nome', 'Nome fantasia', c.nome) +
          campo('ed-razao', 'Razão social', c.razaoSocial) +
          campo('ed-tel', 'Telefone', c.telefone, 'tel') +
          campo('ed-wa', 'WhatsApp', c.whatsapp, 'tel') +
          campo('ed-email', 'E-mail', c.email, 'email') +
          campo('ed-site', 'Website (sem https://)', c.website) +
          campo('ed-ig', 'Instagram', c.instagram) +
          campo('ed-fb', 'Facebook', c.facebook) +
          campo('ed-end', 'Endereço', c.endereco) +
          campo('ed-bairro', 'Bairro', c.bairro) +
          campo('ed-cidade', 'Cidade', c.cidade) +
          campo('ed-uf', 'Estado (UF)', c.uf) +
        '</div>' +
        '<div class="field" style="margin-top:14px"><label class="label" for="ed-svc">Serviços (um por linha)</label>' +
        '<textarea class="textarea" id="ed-svc" placeholder="Ex.: Clínico geral">' +
        ui.esc((c.servicos || []).join('\n')) + '</textarea>' +
        '<p class="hint">Usados na seção de serviços do site demonstração. Deixe em branco para que ' +
        'a demonstração mostre campos a preencher.</p></div>' +
        '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:14px">' +
          '<label style="display:flex;gap:8px;align-items:center;font-size:13px">' +
          '<input type="checkbox" id="ed-fraco"' + (c.siteFraco ? ' checked' : '') + '> Site existente é fraco</label>' +
          '<label style="display:flex;gap:8px;align-items:center;font-size:13px">' +
          '<input type="checkbox" id="ed-gmn"' + (c.googleBusiness ? ' checked' : '') + '> Possui Google Meu Negócio</label>' +
        '</div>',
      rodape: '<button class="btn btn-ghost" data-fechar>Cancelar</button>' +
              '<button class="btn btn-primary" id="ed-salvar">Salvar alterações</button>',
      aoAbrir: function (m) {
        m.querySelector('#ed-salvar').addEventListener('click', function () {
          function v(id) { return m.querySelector('#' + id).value.trim(); }
          if (!v('ed-nome')) { ui.toast('O nome fantasia é obrigatório.', 'err'); return; }
          c.nome = v('ed-nome');
          c.razaoSocial = v('ed-razao');
          c.telefone = v('ed-tel') || null;
          c.whatsapp = v('ed-wa') || null;
          c.email = v('ed-email') || null;
          c.website = v('ed-site').replace(/^https?:\/\//, '') || null;
          c.instagram = v('ed-ig') || null;
          c.facebook = v('ed-fb') || null;
          c.endereco = v('ed-end') || null;
          c.bairro = v('ed-bairro') || null;
          c.cidade = v('ed-cidade') || c.cidade;
          c.uf = v('ed-uf').toUpperCase().slice(0, 2) || c.uf;
          c.siteFraco = m.querySelector('#ed-fraco').checked;
          c.googleBusiness = m.querySelector('#ed-gmn').checked;
          c.dominioProprio = !!c.website;
          c.servicos = v('ed-svc').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
          global.Dados.preparar(c);
          global.Store.salvar();
          ui.fecharModal();
          ui.toast('Empresa atualizada. Score recalculado: ' + c.score + '/100.');
          global.App.recarregar();
        });
      }
    });
  }

  function abaHistorico(c) {
    var ui = global.UI;
    var eventos = global.Store.eventos(c.id);
    var msgs = global.Store.mensagens(c.id).map(function (m) {
      return { id: m.id, tipo: 'mensagem', descricao: 'Abordagem gerada (estilo ' + m.estilo + ') via ' + m.canal,
               created_at: m.created_at };
    });
    var tudo = eventos.concat(msgs).sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });

    if (!tudo.length) {
      return '<div class="card">' + ui.vazio('clock', 'Sem histórico ainda',
        'As ações que você realizar com esta empresa — adicionar ao CRM, gerar abordagem, criar demonstração — ' +
        'aparecerão aqui em ordem cronológica.') + '</div>';
    }

    var icones = { criacao: ['plus', 'var(--accent-soft)', 'var(--accent-hover)'],
                   mudanca_estagio: ['arrowRight', 'var(--violet-soft)', 'var(--violet)'],
                   mensagem: ['sparkles', 'var(--amber-soft)', 'var(--amber)'] };

    return '<div class="card"><div class="card-head"><div class="card-title">Histórico da empresa</div></div>' +
      '<div class="card-pad"><div class="timeline">' + tudo.map(function (e) {
        var ic = icones[e.tipo] || icones.criacao;
        return '<div class="tl-item">' +
          '<span class="tl-dot" style="background:' + ic[1] + ';color:' + ic[2] + '">' + global.ico(ic[0], 15) + '</span>' +
          '<div><div class="tl-title">' + ui.esc(e.descricao) + '</div>' +
          '<div class="tl-time">' + ui.data(e.created_at, true) + ' · ' + ui.tempoRelativo(e.created_at) + '</div></div></div>';
      }).join('') + '</div></div></div>';
  }
})(window);
