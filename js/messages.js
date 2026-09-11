/* SiteHunter AI — Gerador de abordagem personalizada
   Regra fundamental: a mensagem só afirma o que está nos dados da empresa.
   Nada de elogios inventados, números fabricados ou fatos não verificados.
   Onde falta informação, o texto fica neutro. */
(function (global) {
  'use strict';

  var ESTILOS = [
    { id: 'consultivo', nome: 'Consultivo' },
    { id: 'direto',     nome: 'Direto' },
    { id: 'informal',   nome: 'Informal' },
    { id: 'premium',    nome: 'Premium' },
    { id: 'curto',      nome: 'Curto' }
  ];

  /* Variações por estilo para o botão "GERAR OUTRA" não repetir o mesmo texto */
  var ABERTURAS = {
    consultivo: ['Olá, tudo bem?', 'Olá! Tudo certo por aí?', 'Oi, tudo bem?'],
    direto:     ['Olá, tudo bem?', 'Olá!'],
    informal:   ['Oi, tudo bem? 😊', 'Opa, tudo certo?', 'Oi! Tudo bem por aí?'],
    premium:    ['Olá, boa tarde.', 'Olá, tudo bem?', 'Olá.'],
    curto:      ['Olá, tudo bem?', 'Oi, tudo certo?']
  };

  function escolher(lista, semente) {
    return lista[Math.abs(semente) % lista.length];
  }

  /* Descreve o achado principal sem inventar nada */
  function achado(c) {
    if (!c.website) return 'nao_encontrei_site';
    if (c.siteFraco) return 'site_fraco';
    return 'tem_site';
  }

  function canalConhecido(c) {
    if (c.instagram) return 'o Instagram ' + c.instagram;
    if (c.facebook) return 'a página de vocês no Facebook';
    if (c.googleBusiness) return 'o perfil de vocês no Google';
    return null;
  }

  function assinatura(cfg) {
    var nome = (cfg && cfg.consultor && cfg.consultor.nome) || '';
    var emp = (cfg && cfg.consultor && cfg.consultor.empresa) || '';
    if (!nome) return '';
    return '\n\n' + nome + (emp ? '\n' + emp : '');
  }

  function gerar(c, estilo, variacao) {
    var cfg = global.Store ? global.Store.config() : null;
    var v = variacao || 0;
    var empresa = c.nome;
    var cidade = c.cidade + (c.uf ? '/' + c.uf : '');
    var tipo = achado(c);
    var canal = canalConhecido(c);
    var sig = assinatura(cfg);
    var ab = escolher(ABERTURAS[estilo] || ABERTURAS.consultivo, v);
    var t;

    switch (estilo) {
      case 'direto':
        t = ab + '\n\n' +
          'Meu nome é ' + (nomeConsultor(cfg) || '[seu nome]') + ' e trabalho com criação de sites para empresas de ' + cidade + '.\n\n' +
          (tipo === 'nao_encontrei_site'
            ? 'Fiz uma busca por ' + empresa + ' e não encontrei um site próprio da empresa.'
            : tipo === 'site_fraco'
              ? 'Analisei o site atual de ' + empresa + ' e identifiquei pontos que podem estar custando contatos — principalmente em celular.'
              : 'Analisei a presença digital de ' + empresa + ' e separei alguns pontos de melhoria.') + '\n\n' +
          'Preparei uma demonstração gratuita de como ficaria o site de vocês. Posso te enviar o link?' + sig;
        break;

      case 'informal':
        t = ab + '\n\n' +
          'Eu ' + (v % 2 ? 'estava' : 'tava') + ' olhando empresas de ' + cidade + ' aqui e acabei chegando ' +
          (canal ? 'n' + (canal.indexOf('o ') === 0 ? 'o' : 'a') + ' ' + canal.replace(/^(o|a) /, '') : 'em ' + empresa) + '.\n\n' +
          (tipo === 'nao_encontrei_site'
            ? 'Só que procurei o site de vocês e não achei nenhum. '
            : tipo === 'site_fraco'
              ? 'Entrei no site de vocês e senti que dá pra deixar bem melhor, principalmente no celular. '
              : '') +
          'Eu faço site pra negócio local e montei uma demonstração de como o de vocês poderia ficar — sem custo nenhum, só pra você ver.\n\n' +
          'Quer que eu mande o link?' + sig;
        break;

      case 'premium':
        t = ab + '\n\n' +
          'Sou ' + (nomeConsultor(cfg) || '[seu nome]') + (empresaConsultor(cfg) ? ', da ' + empresaConsultor(cfg) : '') +
          ', e conduzo projetos de presença digital para empresas de ' + cidade + '.\n\n' +
          'Durante um mapeamento do setor de ' + (c.segmento || 'atuação de vocês').toLowerCase() + ' na região, ' + empresa + ' apareceu entre as empresas ' +
          'que mais se beneficiariam de um site institucional próprio' +
          (tipo === 'nao_encontrei_site' ? ', por ainda não possuir um endereço próprio na internet' : '') + '.\n\n' +
          'Elaborei uma demonstração exclusiva, sem compromisso, para mostrar como essa presença poderia ser estruturada. ' +
          'Fico à disposição para enviá-la e, se fizer sentido, conversarmos sobre o projeto.' + sig;
        break;

      case 'curto':
        t = ab + '\n\n' +
          (tipo === 'nao_encontrei_site'
            ? 'Procurei o site da ' + empresa + ' e não encontrei.'
            : 'Analisei o site atual da ' + empresa + ' e vi espaço para melhorar.') + ' ' +
          'Fiz uma demonstração gratuita de como poderia ficar.\n\n' +
          'Posso te enviar?' + sig;
        break;

      default: /* consultivo */
        t = ab + '\n\n' +
          'Encontrei a ' + empresa + ' enquanto fazia uma análise de empresas de ' + cidade + '.\n\n' +
          (canal
            ? 'Vi que vocês mantêm ' + canal + ' ativo, '
            : 'Vi que vocês atuam no segmento de ' + (c.segmento || '—').toLowerCase() + ', ') +
          (tipo === 'nao_encontrei_site'
            ? 'porém não encontrei um site próprio da empresa.'
            : tipo === 'site_fraco'
              ? 'e o site atual apresenta pontos que podem estar reduzindo os contatos recebidos.'
              : 'e separei alguns pontos que podem fortalecer ainda mais essa presença.') + '\n\n' +
          'Trabalho justamente ajudando negócios locais a fortalecerem sua presença digital e preparei uma ' +
          'demonstração gratuita de como poderia ficar o site de vocês.\n\n' +
          'Posso te enviar para você dar uma olhada?' + sig;
    }

    return t;
  }

  function nomeConsultor(cfg) { return cfg && cfg.consultor ? cfg.consultor.nome : ''; }
  function empresaConsultor(cfg) { return cfg && cfg.consultor ? cfg.consultor.empresa : ''; }

  /* Mensagem de envio da demonstração pronta */
  function mensagemEnvioDemo(c, url) {
    var cfg = global.Store ? global.Store.config() : null;
    return 'Olá! Como combinado, aqui está a demonstração do site da ' + c.nome + ':\n\n' +
      (url || '[link da demonstração]') + '\n\n' +
      'É uma prévia — todo o conteúdo pode ser ajustado com as informações e fotos reais de vocês.\n\n' +
      'O que achou?' + assinatura(cfg);
  }

  /* Mensagem de acompanhamento de proposta */
  function mensagemProposta(c, proposta) {
    var cfg = global.Store ? global.Store.config() : null;
    return 'Olá! Segue a proposta do site da ' + c.nome + '.\n\n' +
      'Pacote: ' + proposta.pacote_nome + '\n' +
      'Investimento: ' + global.UI.brl(proposta.valor) + '\n' +
      'Prazo de entrega: ' + proposta.prazo + '\n\n' +
      'Qualquer ponto que quiser ajustar, me avise que adapto.' + assinatura(cfg);
  }

  global.Mensagens = {
    estilos: ESTILOS,
    gerar: gerar,
    mensagemEnvioDemo: mensagemEnvioDemo,
    mensagemProposta: mensagemProposta
  };
})(window);
