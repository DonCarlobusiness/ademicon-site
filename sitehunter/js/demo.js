/* SiteHunter AI — Gerador de site demonstração
   PRINCÍPIO: a página gerada só afirma o que consta nos dados da empresa.
   - Serviços: apenas os mapeados. Se não houver, exibe campos a preencher.
   - Depoimentos: sempre rotulados como EXEMPLO ILUSTRATIVO, com nomes genéricos.
   - Nenhuma nota, prêmio, número de clientes ou ano de fundação é inventado.
   - Um selo permanente identifica a página como demonstração não contratada. */
(function (global) {
  'use strict';

  var E = global.UI ? global.UI.esc : function (s) { return String(s === null || s === undefined ? '' : s); };

  var PALETAS = {
    Odontologia:        { p: '#0ea5e9', d: '#0369a1', luz: '#f0f9ff' },
    'Clínica Médica':   { p: '#0d9488', d: '#0f766e', luz: '#f0fdfa' },
    Estética:           { p: '#db2777', d: '#9d174d', luz: '#fdf2f8' },
    'Oficina Mecânica': { p: '#ea580c', d: '#9a3412', luz: '#fff7ed' },
    Restaurante:        { p: '#dc2626', d: '#991b1b', luz: '#fef2f2' },
    Transportadora:     { p: '#1d4ed8', d: '#1e3a8a', luz: '#eff6ff' },
    Contabilidade:      { p: '#0f766e', d: '#115e59', luz: '#f0fdfa' },
    Advocacia:          { p: '#1e293b', d: '#0f172a', luz: '#f8fafc' },
    Academia:           { p: '#16a34a', d: '#15803d', luz: '#f0fdf4' },
    Imobiliária:        { p: '#0369a1', d: '#075985', luz: '#f0f9ff' },
    'Pet Shop':         { p: '#7c3aed', d: '#5b21b6', luz: '#f5f3ff' },
    'Salão de Beleza':  { p: '#c026d3', d: '#86198f', luz: '#fdf4ff' },
    Hotelaria:          { p: '#b45309', d: '#92400e', luz: '#fffbeb' },
    Agronegócio:        { p: '#65a30d', d: '#4d7c0f', luz: '#f7fee7' },
    Educação:           { p: '#4f46e5', d: '#3730a3', luz: '#eef2ff' }
  };
  var PADRAO = { p: '#059669', d: '#047857', luz: '#ecfdf5' };

  /* Diferenciais derivados apenas de fatos cadastrais verificáveis */
  function diferenciais(c) {
    var out = [];
    if (c.abertura) {
      var anos = Math.floor((Date.now() - new Date(c.abertura).getTime()) / 31557600000);
      if (anos >= 1) {
        out.push({ t: anos + (anos === 1 ? ' ano de atividade' : ' anos de atividade'),
                   d: 'Empresa em operação desde ' + new Date(c.abertura).getFullYear() + ', conforme registro cadastral.' });
      }
    }
    out.push({ t: 'Atendimento em ' + c.cidade,
               d: 'Estrutura local em ' + c.cidade + (c.uf ? '/' + c.uf : '') + ' e região.' });
    if (c.whatsapp) out.push({ t: 'Contato direto por WhatsApp', d: 'Fale com a equipe pelo canal que você já usa no dia a dia.' });
    else if (c.telefone) out.push({ t: 'Atendimento por telefone', d: 'Canal direto para dúvidas, orçamentos e agendamentos.' });
    if (c.endereco) {
      out.push({ t: 'Endereço físico',
                 d: 'Unidade de atendimento presencial em ' + (c.bairro || c.cidade) + '.' });
    }
    while (out.length < 3) {
      out.push({ t: '[Diferencial a preencher]', d: 'Espaço reservado para um diferencial informado pela empresa.' });
    }
    return out.slice(0, 4);
  }

  function servicos(c) {
    if (c.servicos && c.servicos.length) return c.servicos;
    return ['[Serviço 1 — a preencher]', '[Serviço 2 — a preencher]', '[Serviço 3 — a preencher]'];
  }

  function sobreTexto(c) {
    var partes = [];
    partes.push('A ' + c.nome + ' atua no segmento de ' + (c.segmento || '—').toLowerCase() +
      ' em ' + c.cidade + (c.uf ? '/' + c.uf : '') + '.');
    if (c.abertura) {
      partes.push('A empresa está em atividade desde ' + new Date(c.abertura).getFullYear() + '.');
    }
    if (c.servicos && c.servicos.length) {
      partes.push('Entre os serviços oferecidos estão ' + listar(c.servicos) + '.');
    }
    partes.push('[Este parágrafo é um texto-base da demonstração. O conteúdo definitivo será escrito com as informações fornecidas pela própria empresa.]');
    return partes.join(' ');
  }

  function listar(arr) {
    var a = arr.slice(0, 4).map(function (s) { return s.toLowerCase(); });
    if (a.length === 1) return a[0];
    return a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1];
  }

  function linkMapa(c) {
    var q = [c.endereco, c.bairro, c.cidade, c.uf].filter(Boolean).join(', ');
    return 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(q);
  }

  function waLink(c) {
    if (!c.whatsapp) return null;
    var msg = 'Olá! Vim pelo site da ' + c.nome + ' e gostaria de mais informações.';
    return global.UI.linkWhatsApp(c.whatsapp, msg);
  }

  /* ---------- HTML do site demonstração ---------- */
  function html(c) {
    var cor = PALETAS[c.segmento] || PADRAO;
    var wa = waLink(c);
    var svcs = servicos(c);
    var difs = diferenciais(c);
    var temEndereco = !!(c.endereco || c.cidade);

    return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="robots" content="noindex,nofollow">' +
      '<title>' + E(c.nome) + ' — Demonstração</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">' +
      '<style>' + css(cor) + '</style></head><body>' +

      '<div class="demo-flag">DEMONSTRAÇÃO — página criada como proposta visual. Não é o site oficial da empresa.</div>' +

      '<header class="hd"><div class="wrap hd-in">' +
        '<a href="#topo" class="lg">' + E(c.nome) + '</a>' +
        '<nav class="nv"><a href="#sobre">Sobre</a><a href="#servicos">Serviços</a>' +
        '<a href="#diferenciais">Diferenciais</a><a href="#contato">Contato</a></nav>' +
        (wa ? '<a class="bt bt-p" href="' + E(wa) + '" target="_blank" rel="noopener">Falar no WhatsApp</a>'
            : (c.telefone ? '<a class="bt bt-p" href="tel:' + E(global.UI.soDigitos(c.telefone)) + '">' + E(c.telefone) + '</a>' : '')) +
      '</div></header>' +

      '<section class="hero" id="topo"><div class="wrap hero-in">' +
        '<span class="eb">' + E(c.segmento || 'Empresa') + ' · ' + E(c.cidade) + (c.uf ? '/' + E(c.uf) : '') + '</span>' +
        '<h1>' + E(c.nome) + '</h1>' +
        '<p class="hero-sub">' + E(subtituloHero(c)) + '</p>' +
        '<div class="hero-bt">' +
          (wa ? '<a class="bt bt-p bt-lg" href="' + E(wa) + '" target="_blank" rel="noopener">Falar no WhatsApp</a>' : '') +
          (c.telefone ? '<a class="bt bt-g bt-lg" href="tel:' + E(global.UI.soDigitos(c.telefone)) + '">Ligar: ' + E(c.telefone) + '</a>' : '') +
          (!wa && !c.telefone ? '<a class="bt bt-p bt-lg" href="#contato">Entre em contato</a>' : '') +
        '</div>' +
      '</div></section>' +

      '<section class="sc" id="sobre"><div class="wrap">' +
        '<span class="tag">Sobre</span><h2>Quem somos</h2>' +
        '<p class="lead">' + E(sobreTexto(c)) + '</p>' +
      '</div></section>' +

      '<section class="sc alt" id="servicos"><div class="wrap">' +
        '<span class="tag">Serviços</span><h2>O que oferecemos</h2>' +
        (c.servicos && c.servicos.length ? '' :
          '<p class="aviso">Os serviços abaixo são campos reservados. Informe a lista real para preenchermos esta seção.</p>') +
        '<div class="gr">' + svcs.map(function (s, i) {
          return '<div class="cd"><span class="cd-n">' + String(i + 1).padStart(2, '0') + '</span>' +
            '<h3>' + E(s) + '</h3><p>[Descrição a ser preenchida com o texto da empresa.]</p></div>';
        }).join('') + '</div>' +
      '</div></section>' +

      '<section class="sc" id="diferenciais"><div class="wrap">' +
        '<span class="tag">Diferenciais</span><h2>Por que escolher a ' + E(c.nome) + '</h2>' +
        '<div class="gr">' + difs.map(function (d) {
          return '<div class="cd"><h3>' + E(d.t) + '</h3><p>' + E(d.d) + '</p></div>';
        }).join('') + '</div>' +
      '</div></section>' +

      '<section class="sc alt" id="depoimentos"><div class="wrap">' +
        '<span class="tag">Depoimentos</span><h2>O que os clientes dizem</h2>' +
        '<div class="alerta"><strong>Conteúdo ilustrativo.</strong> Os depoimentos abaixo são ' +
        'textos de exemplo para demonstrar o layout. Nenhum é um depoimento real de cliente da ' + E(c.nome) + '. ' +
        'Na versão final, entram apenas avaliações verdadeiras autorizadas pela empresa.</div>' +
        '<div class="gr gr-3">' +
          dep('“Espaço reservado para o depoimento de um cliente real.”', 'Cliente 1') +
          dep('“Espaço reservado para o depoimento de um cliente real.”', 'Cliente 2') +
          dep('“Espaço reservado para o depoimento de um cliente real.”', 'Cliente 3') +
        '</div>' +
      '</div></section>' +

      '<section class="sc" id="contato"><div class="wrap">' +
        '<span class="tag">Contato</span><h2>Fale com a gente</h2>' +
        '<div class="ct">' +
          '<div class="ct-box">' +
            linha('Telefone', c.telefone, c.telefone ? 'tel:' + global.UI.soDigitos(c.telefone) : null) +
            linha('WhatsApp', c.whatsapp, wa) +
            linha('E-mail', c.email, c.email ? 'mailto:' + c.email : null) +
            linha('Instagram', c.instagram, c.instagram ? 'https://instagram.com/' + String(c.instagram).replace('@', '') : null) +
            (temEndereco ? linha('Endereço', [c.endereco, c.bairro, c.cidade + (c.uf ? '/' + c.uf : '')].filter(Boolean).join(' — '), linkMapa(c)) : '') +
          '</div>' +
          '<form class="ct-form" onsubmit="event.preventDefault();this.querySelector(\'.fm\').hidden=false;">' +
            '<label>Nome<input type="text" required placeholder="Seu nome"></label>' +
            '<label>Telefone<input type="tel" required placeholder="(00) 00000-0000"></label>' +
            '<label>Mensagem<textarea rows="4" required placeholder="Como podemos ajudar?"></textarea></label>' +
            '<button class="bt bt-p bt-block" type="submit">Enviar mensagem</button>' +
            '<p class="fm" hidden>Formulário de demonstração — no site publicado, as mensagens são entregues no e-mail ou WhatsApp da empresa.</p>' +
          '</form>' +
        '</div>' +
      '</div></section>' +

      '<footer class="ft"><div class="wrap">' +
        '<div><strong>' + E(c.nome) + '</strong>' +
        (c.razaoSocial ? '<br><span class="ft-s">' + E(c.razaoSocial) + '</span>' : '') +
        (c.cnpj ? '<br><span class="ft-s">CNPJ ' + E(c.cnpj) + '</span>' : '') + '</div>' +
        '<div class="ft-s">Página de demonstração gerada pelo SiteHunter AI.<br>' +
        'Os dados exibidos são de origem cadastral pública e podem ser corrigidos pela empresa a qualquer momento.</div>' +
      '</div></footer>' +

      (wa ? '<a class="wa-fx" href="' + E(wa) + '" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">' +
        '<svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M3 21l1.8-5A8.4 8.4 0 1 1 8 19.3z"/></svg><span>WhatsApp</span></a>' : '') +

      '</body></html>';
  }

  function dep(txt, autor) {
    return '<div class="cd dp"><span class="dp-tag">EXEMPLO</span><p class="dp-txt">' + E(txt) + '</p>' +
      '<span class="dp-a">' + E(autor) + ' — nome ilustrativo</span></div>';
  }

  function linha(rot, valor, href) {
    if (!valor) {
      return '<div class="ct-l"><span class="ct-k">' + E(rot) + '</span>' +
        '<span class="ct-v vazio">Não informado — a preencher</span></div>';
    }
    var v = E(valor);
    return '<div class="ct-l"><span class="ct-k">' + E(rot) + '</span>' +
      (href ? '<a class="ct-v" href="' + E(href) + '" target="_blank" rel="noopener">' + v + '</a>'
            : '<span class="ct-v">' + v + '</span>') + '</div>';
  }

  function subtituloHero(c) {
    var s = (c.segmento || '').toLowerCase();
    var base = s ? ('Atendimento em ' + s + ' ') : 'Atendimento ';
    return base + 'em ' + c.cidade + (c.uf ? '/' + c.uf : '') + '. ' +
      (c.servicos && c.servicos.length
        ? 'Serviços: ' + listar(c.servicos) + '.'
        : '[Frase de apresentação a ser definida com a empresa.]');
  }

  function css(cor) {
    return '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:Inter,system-ui,sans-serif;color:#1e293b;line-height:1.65;background:#fff;padding-top:34px}' +
    'h1,h2,h3{font-family:"Plus Jakarta Sans",Inter,sans-serif;letter-spacing:-.025em;line-height:1.2}' +
    'a{color:inherit;text-decoration:none}img{max-width:100%;display:block}' +
    '.wrap{max-width:1080px;margin:0 auto;padding:0 22px}' +
    '.demo-flag{position:fixed;top:0;left:0;right:0;z-index:100;background:#1e293b;color:#fde68a;font-size:11.5px;font-weight:600;padding:9px 16px;text-align:center;letter-spacing:.01em;line-height:1.35}' +
    '.hd{position:sticky;top:34px;z-index:90;background:rgba(255,255,255,.94);backdrop-filter:blur(12px);border-bottom:1px solid #e8ecf2}' +
    '.hd-in{display:flex;align-items:center;gap:22px;padding-top:15px;padding-bottom:15px}' +
    '.lg{font-family:"Plus Jakarta Sans";font-weight:800;font-size:15.5px;letter-spacing:-.02em;color:' + cor.d + ';max-width:280px}' +
    '.nv{display:flex;gap:22px;margin-left:auto;font-size:13.5px;font-weight:500;color:#475569}' +
    '.nv a:hover{color:' + cor.p + '}' +
    '.bt{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 17px;border-radius:11px;font-weight:600;font-size:13.5px;border:1px solid transparent;cursor:pointer;transition:.15s}' +
    '.bt-p{background:' + cor.p + ';color:#fff}.bt-p:hover{background:' + cor.d + '}' +
    '.bt-g{background:#fff;color:#334155;border-color:#dde3ec}.bt-g:hover{background:#f6f8fb}' +
    '.bt-lg{padding:14px 24px;font-size:15px;border-radius:13px}.bt-block{width:100%}' +
    '.hero{padding:78px 0 84px;background:linear-gradient(165deg,' + cor.luz + ',#fff 72%);border-bottom:1px solid #eef1f6}' +
    '.hero-in{max-width:760px}' +
    '.eb{display:inline-block;padding:5px 13px;border-radius:99px;background:' + cor.p + '18;color:' + cor.d + ';font-size:12px;font-weight:700;margin-bottom:18px}' +
    '.hero h1{font-size:clamp(30px,5.2vw,50px);font-weight:800;margin-bottom:16px}' +
    '.hero-sub{font-size:17px;color:#475569;max-width:60ch}' +
    '.hero-bt{display:flex;gap:11px;margin-top:30px;flex-wrap:wrap}' +
    '.sc{padding:66px 0}.sc.alt{background:#f7f9fc;border-block:1px solid #eef1f6}' +
    '.tag{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:' + cor.p + ';margin-bottom:9px}' +
    '.sc h2{font-size:clamp(23px,3.4vw,33px);font-weight:700;margin-bottom:20px}' +
    '.lead{font-size:16px;color:#475569;max-width:74ch}' +
    '.gr{display:grid;grid-template-columns:repeat(auto-fit,minmax(248px,1fr));gap:16px;margin-top:26px}' +
    '.gr-3{grid-template-columns:repeat(auto-fit,minmax(232px,1fr))}' +
    '.cd{background:#fff;border:1px solid #e8ecf2;border-radius:16px;padding:22px;transition:.18s}' +
    '.cd:hover{box-shadow:0 10px 34px -12px rgba(15,23,42,.16);transform:translateY(-2px)}' +
    '.cd-n{display:block;font-family:"Plus Jakarta Sans";font-size:12px;font-weight:800;color:' + cor.p + ';margin-bottom:9px}' +
    '.cd h3{font-size:16px;margin-bottom:8px}.cd p{font-size:13.5px;color:#64748b}' +
    '.aviso{font-size:13px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:11px;padding:12px 15px;margin-top:6px}' +
    '.alerta{font-size:13px;color:#7c2d12;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 17px;line-height:1.6}' +
    '.dp{position:relative;padding-top:30px}' +
    '.dp-tag{position:absolute;top:13px;left:22px;font-size:9.5px;font-weight:800;letter-spacing:.11em;color:#b45309;background:#fef3c7;padding:3px 8px;border-radius:5px}' +
    '.dp-txt{font-size:14.5px;color:#475569;font-style:italic;margin-bottom:11px}' +
    '.dp-a{font-size:12px;color:#94a3b8;font-weight:600}' +
    '.ct{display:grid;grid-template-columns:1fr 1fr;gap:34px;margin-top:26px;align-items:start}' +
    '.ct-box{display:flex;flex-direction:column;gap:2px}' +
    '.ct-l{display:flex;flex-direction:column;gap:3px;padding:13px 0;border-bottom:1px solid #e8ecf2}' +
    '.ct-k{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8}' +
    '.ct-v{font-size:15px;font-weight:550;color:#1e293b;word-break:break-word}' +
    'a.ct-v:hover{color:' + cor.p + '}.ct-v.vazio{color:#b6bfcc;font-style:italic;font-weight:400;font-size:14px}' +
    '.ct-form{background:#fff;border:1px solid #e8ecf2;border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:13px}' +
    '.ct-form label{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:600;color:#475569}' +
    '.ct-form input,.ct-form textarea{padding:11px 13px;border:1px solid #dde3ec;border-radius:10px;font:inherit;font-size:14px;font-weight:400;color:#1e293b}' +
    '.ct-form input:focus,.ct-form textarea:focus{outline:none;border-color:' + cor.p + ';box-shadow:0 0 0 3px ' + cor.p + '26}' +
    '.fm{font-size:12px;color:#64748b;background:#f1f5f9;border-radius:9px;padding:10px 12px;line-height:1.5}' +
    '.ft{background:#0f172a;color:#cbd5e1;padding:40px 0;font-size:13.5px}' +
    '.ft .wrap{display:flex;justify-content:space-between;gap:26px;flex-wrap:wrap}' +
    '.ft-s{color:#8095ae;font-size:12px;line-height:1.7}' +
    '.wa-fx{position:fixed;right:18px;bottom:18px;z-index:95;display:flex;align-items:center;gap:9px;background:#25d366;color:#0a2e19;padding:13px 19px;border-radius:99px;font-weight:700;font-size:14px;box-shadow:0 10px 30px -8px rgba(37,211,102,.65)}' +
    '.wa-fx:hover{background:#20bd5a}' +
    '@media(max-width:820px){.nv{display:none}.ct{grid-template-columns:1fr;gap:26px}.hd-in{gap:12px}' +
    '.sc{padding:46px 0}.hero{padding:48px 0 56px}.hero-bt .bt{width:100%}.wa-fx span{display:none}.wa-fx{padding:15px;border-radius:50%}' +
    '.lg{font-size:14px;max-width:170px}.demo-flag{font-size:10.5px;padding:7px 12px}body{padding-top:44px}.hd{top:44px}}';
  }

  /* ---------- Abertura / URL ---------- */
  function abrir(c) {
    var doc = html(c);
    var blob = new Blob([doc], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var w = global.open(url, '_blank');
    if (!w) {
      global.UI.toast('O navegador bloqueou a nova aba. Libere pop-ups para visualizar a demonstração.', 'err');
      URL.revokeObjectURL(url);
      return null;
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    return url;
  }

  /* Link compartilhável. Enquanto não há backend de hospedagem, devolve a rota
     interna que reabre a demonstração dentro do app. Ver integrations.js. */
  function urlPublica(demo, c) {
    var base = global.location.origin + global.location.pathname;
    return base + '#/demo/' + (demo ? demo.id : 'preview') + '/' + (c ? c.id : '');
  }

  global.SiteDemo = { html: html, abrir: abrir, urlPublica: urlPublica, paletas: PALETAS };
})(window);
