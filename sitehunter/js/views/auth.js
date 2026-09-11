/* SiteHunter AI — Login, criação de conta e recuperação de senha */
(function (global) {
  'use strict';
  global.Views = global.Views || {};

  var FLUXO_LATERAL = [
    'Encontre empresas sem site na sua região',
    'Receba um score de oportunidade justificado',
    'Gere o site demonstração em um clique',
    'Envie a abordagem e acompanhe no CRM',
    'Feche a venda com proposta pronta'
  ];

  function moldura(conteudo) {
    return '<div class="auth">' +
      '<aside class="auth-side">' +
        '<a href="#/" class="lp-brand" style="color:#fff">' +
          '<span class="brand-mark">' + global.ico('radar', 19) + '</span>' +
          '<span class="brand-name" style="color:#fff">SiteHunter<span>Prospecção digital</span></span></a>' +
        '<div>' +
          '<h2>Encontre empresas.<br>Descubra oportunidades.<br>Venda sites.</h2>' +
          '<p>A plataforma que leva você do primeiro filtro até o contrato assinado, sem trocar de ferramenta.</p>' +
          '<div class="auth-flow">' + FLUXO_LATERAL.map(function (t, i) {
            return '<div class="auth-flow-item"><span class="auth-flow-num">' + (i + 1) + '</span>' +
              global.UI.esc(t) + '</div>';
          }).join('') + '</div>' +
        '</div>' +
        '<p style="font-size:12px;color:#7f9c8f">Base de demonstração com empresas fictícias. ' +
        'Nenhum dado real é utilizado.</p>' +
      '</aside>' +
      '<main class="auth-main"><div class="auth-box">' + conteudo + '</div></main>' +
    '</div>';
  }

  function campoSenha(id, rotulo, autocomplete) {
    return '<div class="field"><label class="label" for="' + id + '">' + rotulo + '</label>' +
      '<div class="pw-wrap"><input class="input" type="password" id="' + id + '" ' +
      'autocomplete="' + autocomplete + '" placeholder="••••••••" required>' +
      '<button type="button" class="pw-toggle" data-pw="' + id + '" aria-label="Mostrar senha">' +
      global.ico('eye', 17) + '</button></div></div>';
  }

  function ligarToggles(root) {
    root.querySelectorAll('[data-pw]').forEach(function (b) {
      b.addEventListener('click', function () {
        var inp = root.querySelector('#' + b.dataset.pw);
        var mostrar = inp.type === 'password';
        inp.type = mostrar ? 'text' : 'password';
        b.innerHTML = global.ico(mostrar ? 'eyeOff' : 'eye', 17);
        b.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
      });
    });
  }

  function destinoDe(query) {
    return (query && query.destino) ? query.destino : '/app/visao-geral';
  }

  /* ---------------- Entrar ---------------- */
  global.Views.entrar = function (root, params, query) {
    root.innerHTML = moldura(
      '<h1 class="auth-title">Entrar na sua conta</h1>' +
      '<p class="auth-sub">Retome sua prospecção de onde parou.</p>' +
      '<form class="auth-form" id="f-login" novalidate>' +
        '<div class="field"><label class="label" for="lg-email">E-mail</label>' +
        '<input class="input" type="email" id="lg-email" autocomplete="email" placeholder="voce@empresa.com.br" required autofocus></div>' +
        campoSenha('lg-senha', 'Senha', 'current-password') +
        '<div style="display:flex;justify-content:flex-end;margin-top:-4px">' +
        '<a href="#/recuperar-senha" class="link" style="font-size:12.5px">Esqueci minha senha</a></div>' +
        '<div id="lg-erro"></div>' +
        '<button class="btn btn-primary btn-lg btn-block" type="submit">Entrar</button>' +
      '</form>' +
      '<div class="auth-alt">Ainda não tem conta? <a href="#/criar-conta">Criar conta</a></div>' +
      '<div class="auth-demo">' +
        '<strong>Acesso de demonstração</strong><br>' +
        'Entre sem cadastro e explore com as ' + global.Store.empresas().length + ' empresas fictícias já carregadas.' +
        '<button class="btn btn-soft btn-block" id="lg-demo" style="margin-top:11px">Entrar com conta de demonstração</button>' +
      '</div>'
    );

    ligarToggles(root);

    root.querySelector('#lg-demo').addEventListener('click', function () {
      global.Store.entrarDemo();
      global.UI.toast('Bem-vindo! Você está na conta de demonstração.');
      global.Router.ir(destinoDe(query));
    });

    root.querySelector('#f-login').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = root.querySelector('#lg-email').value.trim();
      var senha = root.querySelector('#lg-senha').value;
      var box = root.querySelector('#lg-erro');
      if (!email || !senha) { erro(box, 'Preencha e-mail e senha.'); return; }
      var r = global.Store.entrar(email, senha);
      if (!r.ok) { erro(box, r.erro); return; }
      global.UI.toast('Bem-vindo de volta, ' + r.user.nome.split(' ')[0] + '!');
      global.Router.ir(destinoDe(query));
    });

    /* Atalho vindo da landing: ?demo=1 já prepara a conta de demonstração */
    if (query && query.demo === '1') {
      global.Store.entrarDemo();
      global.Router.ir(destinoDe(query), true);
    }
  };

  /* ---------------- Criar conta ---------------- */
  global.Views.criarConta = function (root, params, query) {
    root.innerHTML = moldura(
      '<h1 class="auth-title">Criar sua conta</h1>' +
      '<p class="auth-sub">Leva menos de um minuto e você já começa a prospectar.</p>' +
      '<form class="auth-form" id="f-conta" novalidate>' +
        '<div class="field"><label class="label" for="cc-nome">Nome completo</label>' +
        '<input class="input" type="text" id="cc-nome" autocomplete="name" placeholder="Seu nome" required autofocus></div>' +
        '<div class="field"><label class="label" for="cc-email">E-mail</label>' +
        '<input class="input" type="email" id="cc-email" autocomplete="email" placeholder="voce@empresa.com.br" required></div>' +
        campoSenha('cc-senha', 'Senha', 'new-password') +
        '<p class="hint">Mínimo de 8 caracteres.</p>' +
        '<label style="display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:var(--text-soft);line-height:1.55">' +
          '<input type="checkbox" id="cc-termos" style="margin-top:2px" required>' +
          '<span>Li e aceito os <a href="#/legal/termos" class="link">Termos de Uso</a> e a ' +
          '<a href="#/legal/privacidade" class="link">Política de Privacidade</a>.</span></label>' +
        '<div id="cc-erro"></div>' +
        '<button class="btn btn-primary btn-lg btn-block" type="submit">Criar conta</button>' +
      '</form>' +
      '<div class="auth-alt">Já tem conta? <a href="#/entrar">Entrar</a></div>' +
      '<div class="auth-demo"><strong>Onde seus dados ficam</strong><br>' +
      'Nesta versão, a conta é gravada apenas no armazenamento local deste navegador. ' +
      'Nada é enviado para servidores.</div>'
    );

    ligarToggles(root);

    root.querySelector('#f-conta').addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = root.querySelector('#cc-nome').value.trim();
      var email = root.querySelector('#cc-email').value.trim();
      var senha = root.querySelector('#cc-senha').value;
      var termos = root.querySelector('#cc-termos').checked;
      var box = root.querySelector('#cc-erro');

      if (nome.length < 3) { erro(box, 'Informe seu nome completo.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erro(box, 'Informe um e-mail válido.'); return; }
      if (senha.length < 8) { erro(box, 'A senha precisa ter ao menos 8 caracteres.'); return; }
      if (!termos) { erro(box, 'É necessário aceitar os Termos de Uso e a Política de Privacidade.'); return; }

      var r = global.Store.registrar(nome, email, senha);
      if (!r.ok) { erro(box, r.erro); return; }
      global.Store.salvarConfig({ consultor: Object.assign({}, global.Store.config().consultor, { nome: nome, email: email }) });
      global.UI.toast('Conta criada. Bem-vindo ao SiteHunter AI!');
      global.Router.ir(destinoDe(query));
    });
  };

  /* ---------------- Recuperar senha ---------------- */
  global.Views.recuperarSenha = function (root) {
    root.innerHTML = moldura(
      '<h1 class="auth-title">Esqueci minha senha</h1>' +
      '<p class="auth-sub">Informe o e-mail da conta e enviaremos as instruções de redefinição.</p>' +
      '<form class="auth-form" id="f-rec" novalidate>' +
        '<div class="field"><label class="label" for="rc-email">E-mail</label>' +
        '<input class="input" type="email" id="rc-email" autocomplete="email" placeholder="voce@empresa.com.br" required autofocus></div>' +
        '<div id="rc-msg"></div>' +
        '<button class="btn btn-primary btn-lg btn-block" type="submit">Enviar instruções</button>' +
      '</form>' +
      '<div class="auth-alt"><a href="#/entrar">Voltar para o login</a></div>' +
      '<div class="auth-demo"><strong>Integração pendente</strong><br>' +
      'O envio de e-mail ainda não está conectado nesta instalação. A estrutura está pronta em ' +
      '<code>js/integrations.js</code> — basta plugar o serviço de e-mail escolhido.</div>'
    );

    root.querySelector('#f-rec').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = root.querySelector('#rc-email').value.trim();
      var box = root.querySelector('#rc-msg');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erro(box, 'Informe um e-mail válido.'); return; }
      global.Integracoes.email.enviar(email, 'Redefinição de senha', '').then(function (r) {
        box.innerHTML = '<div class="auth-demo" style="margin:0">' + global.UI.esc(r.mensagem) +
          '<br><br>Em produção, um link de redefinição válido por 30 minutos seria enviado para <strong>' +
          global.UI.esc(email) + '</strong>.</div>';
      });
    });
  };

  function erro(box, msg) {
    box.innerHTML = '<div style="display:flex;gap:9px;align-items:flex-start;background:var(--rose-soft);' +
      'color:var(--rose);border-radius:var(--r);padding:11px 13px;font-size:13px;line-height:1.5">' +
      global.ico('alert', 16) + '<span>' + global.UI.esc(msg) + '</span></div>';
  }
})(window);
