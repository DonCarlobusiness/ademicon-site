/* SiteHunter AI — Configurações */
(function (global) {
  'use strict';
  global.Views = global.Views || {};

  global.Views.configuracoes = function (page, params, query) {
    var ui = global.UI;
    var aba = (query && query.aba) || 'perfil';
    var cfg = global.Store.config();

    page.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">Configurações</h1>' +
        '<p class="page-sub">Dados do consultor, pacotes comerciais, integrações e privacidade.</p></div>' +
      '</div>' +
      '<div class="tabs">' +
        [['perfil', 'Perfil'], ['pacotes', 'Pacotes'], ['integracoes', 'Integrações'],
         ['privacidade', 'Privacidade'], ['dados', 'Dados locais']].map(function (t) {
          return '<button class="tab ' + (aba === t[0] ? 'active' : '') + '" data-aba="' + t[0] + '">' + t[1] + '</button>';
        }).join('') +
      '</div><div id="cfg-conteudo"></div>';

    function pintar() {
      var el = page.querySelector('#cfg-conteudo');
      cfg = global.Store.config();
      if (aba === 'pacotes') { el.innerHTML = abaPacotes(); ligarPacotes(el); }
      else if (aba === 'integracoes') el.innerHTML = abaIntegracoes();
      else if (aba === 'privacidade') { el.innerHTML = abaPrivacidade(cfg); ligarPrivacidade(el); }
      else if (aba === 'dados') { el.innerHTML = abaDados(); ligarDados(el); }
      else { el.innerHTML = abaPerfil(cfg); ligarPerfil(el); }
      page.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.aba === aba); });
    }
    pintar();
    ui.aoClicar(page, '[data-aba]', function (b) { aba = b.dataset.aba; pintar(); });
  };

  /* ---------- Perfil ---------- */
  function abaPerfil(cfg) {
    var ui = global.UI;
    var u = global.Store.usuario() || {};
    var c = cfg.consultor || {};
    return '<div class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)">' +
      '<div class="card"><div class="card-head"><div>' +
        '<div class="card-title">Seus dados</div>' +
        '<div class="card-sub">Usados na assinatura das abordagens e no cabeçalho das propostas</div></div></div>' +
        '<div class="card-pad"><div class="filters">' +
          campo('cf-nome', 'Seu nome', c.nome) +
          campo('cf-empresa', 'Sua empresa / marca', c.empresa) +
          campo('cf-tel', 'Seu telefone', c.telefone, 'tel') +
          campo('cf-email', 'Seu e-mail', c.email, 'email') +
        '</div>' +
        '<button class="btn btn-primary" id="cf-salvar" style="margin-top:18px">Salvar alterações</button>' +
        '</div></div>' +

      '<div class="card"><div class="card-head"><div class="card-title">Conta</div></div>' +
        '<div class="card-pad"><div class="data-list">' +
          '<div class="data-item"><div class="data-k">Nome da conta</div><div class="data-v">' +
            ui.esc(u.nome || '—') + '</div></div>' +
          '<div class="data-item"><div class="data-k">E-mail</div><div class="data-v">' +
            ui.esc(u.email || '—') + '</div></div>' +
          '<div class="data-item"><div class="data-k">Criada em</div><div class="data-v">' +
            ui.data(u.created_at, true) + '</div></div>' +
        '</div>' +
        '<div style="margin-top:16px"><div class="label" style="margin-bottom:8px">Aparência</div>' +
        '<div class="seg-toggle"><button id="tema-claro" class="' +
          (global.Store.config().tema !== 'dark' ? 'active' : '') + '">' + global.ico('sun', 14) + ' Claro</button>' +
        '<button id="tema-escuro" class="' + (global.Store.config().tema === 'dark' ? 'active' : '') + '">' +
          global.ico('moon', 14) + ' Escuro</button></div></div>' +
        '</div></div></div>';
  }

  function ligarPerfil(el) {
    el.querySelector('#cf-salvar').addEventListener('click', function () {
      global.Store.salvarConfig({
        consultor: {
          nome: el.querySelector('#cf-nome').value.trim(),
          empresa: el.querySelector('#cf-empresa').value.trim(),
          telefone: el.querySelector('#cf-tel').value.trim(),
          email: el.querySelector('#cf-email').value.trim()
        }
      });
      global.UI.toast('Dados salvos. As abordagens já usam a nova assinatura.');
    });
    el.querySelector('#tema-claro').addEventListener('click', function () {
      global.Store.salvarConfig({ tema: 'light' }); global.UI.aplicarTema('light'); global.App.recarregar();
    });
    el.querySelector('#tema-escuro').addEventListener('click', function () {
      global.Store.salvarConfig({ tema: 'dark' }); global.UI.aplicarTema('dark'); global.App.recarregar();
    });
  }

  function campo(id, rotulo, valor, tipo) {
    return '<div class="field"><label class="label" for="' + id + '">' + rotulo + '</label>' +
      '<input class="input" type="' + (tipo || 'text') + '" id="' + id + '" value="' +
      global.UI.esc(valor || '') + '"></div>';
  }

  /* ---------- Pacotes ---------- */
  function abaPacotes() {
    var ui = global.UI;
    var pacotes = global.Store.pacotes();
    return '<div class="card"><div class="card-head"><div>' +
      '<div class="card-title">Pacotes comerciais</div>' +
      '<div class="card-sub">Editam os valores usados no gerador de propostas</div></div>' +
      '<button class="btn btn-ghost btn-sm" id="pc-restaurar">' + global.ico('refresh', 14) + ' Restaurar padrão</button>' +
      '</div><div class="card-pad"><div class="grid g-3">' +
        pacotes.map(function (p, i) {
          return '<div class="card" style="box-shadow:none"><div class="card-pad">' +
            '<div class="field" style="margin-bottom:12px"><label class="label">Nome do pacote</label>' +
            '<input class="input" data-pc="' + i + '" data-campo="nome" value="' + ui.esc(p.nome) + '"></div>' +
            '<div class="field" style="margin-bottom:12px"><label class="label">Valor (R$)</label>' +
            '<input class="input mono" type="number" min="0" step="10" data-pc="' + i + '" data-campo="valor" value="' + p.valor + '"></div>' +
            '<div class="field" style="margin-bottom:12px"><label class="label">Prazo</label>' +
            '<input class="input" data-pc="' + i + '" data-campo="prazo" value="' + ui.esc(p.prazo) + '"></div>' +
            '<div class="field"><label class="label">Itens inclusos (um por linha)</label>' +
            '<textarea class="textarea" data-pc="' + i + '" data-campo="itens">' + ui.esc(p.itens.join('\n')) + '</textarea></div>' +
            '</div></div>';
        }).join('') +
      '</div>' +
      '<button class="btn btn-primary" id="pc-salvar" style="margin-top:18px">Salvar pacotes</button>' +
      '</div></div>';
  }

  function ligarPacotes(el) {
    el.querySelector('#pc-salvar').addEventListener('click', function () {
      var base = global.Store.pacotes();
      var novos = base.map(function (p, i) {
        function v(campo) {
          var inp = el.querySelector('[data-pc="' + i + '"][data-campo="' + campo + '"]');
          return inp ? inp.value : '';
        }
        return {
          id: p.id,
          nome: v('nome').trim() || p.nome,
          valor: parseInt(v('valor'), 10) || p.valor,
          prazo: v('prazo').trim() || p.prazo,
          destaque: p.destaque,
          itens: v('itens').split('\n').map(function (s) { return s.trim(); }).filter(Boolean)
        };
      });
      global.Store.salvarConfig({ pacotes: novos });
      global.UI.toast('Pacotes atualizados.');
      global.App.recarregar();
    });
    el.querySelector('#pc-restaurar').addEventListener('click', function () {
      global.UI.confirmar('Restaurar pacotes padrão',
        'Os pacotes voltam aos valores originais: R$ 597, R$ 997 e R$ 1.497. Propostas já emitidas não mudam.',
        function () {
          global.Store.salvarConfig({ pacotes: null });
          global.UI.toast('Pacotes restaurados.');
          global.App.recarregar();
        }, 'Restaurar');
    });
  }

  /* ---------- Integrações ---------- */
  function abaIntegracoes() {
    var ui = global.UI;
    return '<div class="card"><div class="card-head"><div>' +
      '<div class="card-title">Integrações</div>' +
      '<div class="card-sub">Nenhuma conectada nesta instalação. A arquitetura está pronta em ' +
      '<code>js/integrations.js</code> — cada adaptador declara a interface esperada.</div></div></div>' +
      '<div>' + global.Integracoes.listar().map(function (i) {
        return '<div class="audit-row" style="padding:15px 20px">' +
          '<div class="audit-k"><span class="audit-ico" style="background:var(--surface-2);color:var(--text-muted)">' +
          global.ico(iconeDe(i.chave), 15) + '</span>' +
          '<span><span style="display:block;font-weight:650">' + ui.esc(i.nome) + '</span>' +
          (i.licenca ? '<span class="co-sub">' + ui.esc(i.licenca) + '</span>' : '') + '</span></div>' +
          '<span class="badge badge-amber badge-dot">Planejado</span></div>';
      }).join('') + '</div>' +
      '<div class="card-pad" style="border-top:1px solid var(--border)">' +
        '<div class="rec-box">' + global.ico('shield', 18) +
        '<p><strong>Política de coleta.</strong> São admitidas fontes públicas e oficiais ' +
        '(Dados Abertos CNPJ da Receita Federal) e bases com licença aberta (OpenStreetMap/ODbL), ' +
        'além de APIs de busca com uso programático autorizado. Não há — e não haverá — raspagem ' +
        'do Google Maps ou de qualquer serviço cujos termos de uso a proíbam.</p></div>' +
      '</div></div>';
  }

  function iconeDe(chave) {
    return { receitaFederal: 'id', openStreetMap: 'mapPin', auditoriaWeb: 'globe', buscaWeb: 'search',
             supabase: 'layers', email: 'mail', whatsapp: 'whatsapp', mercadoPago: 'money',
             hospedagemDemo: 'layout' }[chave] || 'info';
  }

  /* ---------- Privacidade ---------- */
  function abaPrivacidade(cfg) {
    var ui = global.UI;
    var lista = cfg.optOut || [];
    return '<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">' +
      '<div class="card"><div class="card-head"><div>' +
        '<div class="card-title">Opt-out de comunicações</div>' +
        '<div class="card-sub">Contatos nesta lista ficam bloqueados para envio de abordagens</div></div></div>' +
        '<div class="card-pad">' +
          '<div class="field"><label class="label" for="oo-tel">Telefone ou e-mail a bloquear</label>' +
          '<input class="input" id="oo-tel" placeholder="(00) 00000-0000 ou contato@empresa.com.br"></div>' +
          '<button class="btn btn-primary btn-sm" id="oo-add" style="margin-top:12px">' +
            global.ico('plus', 14) + ' Adicionar ao opt-out</button>' +
          (lista.length
            ? '<div style="margin-top:20px"><div class="label" style="margin-bottom:9px">' +
              lista.length + ' contato(s) bloqueado(s)</div>' +
              lista.map(function (x) {
                return '<div class="audit-row"><span class="mono" style="font-size:13px">' + ui.esc(x) + '</span>' +
                  '<span class="badge badge-rose badge-dot">Bloqueado</span></div>';
              }).join('') + '</div>'
            : '<p class="hint" style="margin-top:16px">Nenhum contato bloqueado até o momento.</p>') +
        '</div></div>' +

      '<div class="card"><div class="card-head"><div class="card-title">Documentos e direitos</div></div>' +
        '<div class="card-pad"><div style="display:flex;flex-direction:column;gap:8px">' +
          '<a class="btn btn-ghost btn-block" href="#/legal/privacidade" style="justify-content:flex-start">' +
            global.ico('shield', 16) + ' Política de Privacidade</a>' +
          '<a class="btn btn-ghost btn-block" href="#/legal/termos" style="justify-content:flex-start">' +
            global.ico('doc', 16) + ' Termos de Uso</a>' +
          '<a class="btn btn-ghost btn-block" href="#/legal/dados" style="justify-content:flex-start">' +
            global.ico('layers', 16) + ' Origem dos dados</a>' +
          '<a class="btn btn-ghost btn-block" href="#/legal/remocao" style="justify-content:flex-start">' +
            global.ico('trash', 16) + ' Solicitação de remoção</a>' +
        '</div>' +
        '<p class="hint" style="margin-top:16px">' + global.ico('info', 13) +
        ' O envio de mensagens é sempre disparado por você, em seus próprios canais. ' +
        'O aplicativo não realiza disparos automáticos.</p>' +
        '</div></div></div>';
  }

  function ligarPrivacidade(el) {
    el.querySelector('#oo-add').addEventListener('click', function () {
      var inp = el.querySelector('#oo-tel');
      var v = inp.value.trim();
      if (!v) { global.UI.toast('Informe um telefone ou e-mail.', 'err'); return; }
      var chave = v.indexOf('@') !== -1 ? v.toLowerCase() : global.UI.soDigitos(v);
      global.Store.optOut(chave);
      global.UI.toast('Contato adicionado ao opt-out. Envios para ele ficam bloqueados.');
      global.App.recarregar();
    });
  }

  /* ---------- Dados locais ---------- */
  function abaDados() {
    var ui = global.UI;
    var db = global.Store.raw();
    var tabelas = [
      ['users', 'Usuários', db.users.length],
      ['companies', 'Empresas', db.companies.length],
      ['digital_audits', 'Auditorias digitais', db.digital_audits.length],
      ['leads', 'Leads', db.leads.length],
      ['crm_events', 'Eventos de CRM', db.crm_events.length],
      ['demos', 'Demonstrações', db.demos.length],
      ['proposals', 'Propostas', db.proposals.length],
      ['messages', 'Mensagens geradas', db.messages.length]
    ];

    return '<div class="card"><div class="card-head"><div>' +
      '<div class="card-title">Armazenamento local</div>' +
      '<div class="card-sub">Tudo é gravado no localStorage deste navegador. ' +
      'O esquema equivalente em PostgreSQL está em <code>db/schema.sql</code>.</div></div></div>' +
      '<div class="table-wrap"><table class="tbl" style="min-width:440px"><thead><tr>' +
      '<th>Tabela</th><th>Descrição</th><th>Registros</th></tr></thead><tbody>' +
      tabelas.map(function (t) {
        return '<tr><td class="mono" style="font-weight:650">' + t[0] + '</td>' +
          '<td class="soft">' + ui.esc(t[1]) + '</td>' +
          '<td class="mono" style="font-weight:700">' + t[2] + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="card-pad" style="border-top:1px solid var(--border);display:flex;gap:9px;flex-wrap:wrap">' +
        '<button class="btn btn-ghost" id="dd-exportar">' + global.ico('download', 16) + ' Exportar tudo (JSON)</button>' +
        '<button class="btn btn-ghost" id="dd-resetar">' + global.ico('refresh', 16) + ' Restaurar base de demonstração</button>' +
        '<button class="btn btn-danger" id="dd-apagar">' + global.ico('trash', 16) + ' Apagar todos os dados</button>' +
      '</div></div>';
  }

  function ligarDados(el) {
    el.querySelector('#dd-exportar').addEventListener('click', function () {
      global.App.baixar('sitehunter-dados.json', global.Store.exportar(), 'application/json');
      global.UI.toast('Backup gerado.');
    });
    el.querySelector('#dd-resetar').addEventListener('click', function () {
      global.UI.confirmar('Restaurar base de demonstração',
        'A base volta às 30 empresas fictícias originais. Leads, demonstrações e propostas que você criou serão perdidos.',
        function () {
          global.Store.limparTudo();
          global.Store.entrarDemo();
          global.UI.toast('Base de demonstração restaurada.');
          global.Router.ir('/app/visao-geral');
          global.App.recarregar();
        }, 'Restaurar', true);
    });
    el.querySelector('#dd-apagar').addEventListener('click', function () {
      global.UI.confirmar('Apagar todos os dados',
        'Todos os dados deste navegador serão apagados, incluindo sua conta, leads, demonstrações e propostas. ' +
        'Esta ação não pode ser desfeita.',
        function () {
          global.Store.limparTudo();
          global.Store.sair();
          global.UI.toast('Dados apagados.', 'info');
          global.Router.ir('/');
          global.location.reload();
        }, 'Apagar tudo', true);
    });
  }
})(window);
