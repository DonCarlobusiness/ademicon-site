/* SiteHunter AI — utilitários de interface */
(function (global) {
  'use strict';

  /* ---------- Escape / formatação ---------- */
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function brl(v) {
    var n = Number(v) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }
  function brlExato(v) {
    return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  }
  function num(v) { return (Number(v) || 0).toLocaleString('pt-BR'); }
  function pct(v, casas) { return (Number(v) || 0).toFixed(casas === undefined ? 1 : casas).replace('.', ',') + '%'; }

  function data(iso, comHora) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    var o = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (comHora) { o.hour = '2-digit'; o.minute = '2-digit'; }
    return d.toLocaleDateString('pt-BR', o);
  }

  function tempoRelativo(iso) {
    if (!iso) return 'sem registro';
    var diff = Date.now() - new Date(iso).getTime();
    var min = Math.round(diff / 6e4);
    if (min < 1) return 'agora';
    if (min < 60) return 'há ' + min + ' min';
    var h = Math.round(min / 60);
    if (h < 24) return 'há ' + h + 'h';
    var d = Math.round(h / 24);
    if (d === 1) return 'ontem';
    if (d < 31) return 'há ' + d + ' dias';
    var m = Math.round(d / 30);
    return 'há ' + m + (m === 1 ? ' mês' : ' meses');
  }

  function soDigitos(s) { return (s || '').replace(/\D/g, ''); }

  function telefoneE164(tel) {
    var d = soDigitos(tel);
    if (!d) return '';
    if (d.length <= 11) d = '55' + d;
    return d;
  }

  function linkWhatsApp(tel, texto) {
    var n = telefoneE164(tel);
    return 'https://wa.me/' + n + (texto ? '?text=' + encodeURIComponent(texto) : '');
  }

  function iniciais(nome) {
    var p = (nome || '?').trim().split(/\s+/).filter(function (x) { return x.length > 2 || /^[A-Z]/.test(x); });
    if (!p.length) p = [(nome || '?')];
    return ((p[0][0] || '') + (p.length > 1 ? (p[1][0] || '') : '')).toUpperCase();
  }

  /* Cor determinística por nome — evita logos genéricos iguais */
  var PALETA = [
    ['#ecfdf5', '#047857'], ['#eff6ff', '#1d4ed8'], ['#fef3c7', '#b45309'],
    ['#fae8ff', '#a21caf'], ['#ffe4e6', '#be123c'], ['#ccfbf1', '#0f766e'],
    ['#e0e7ff', '#4338ca'], ['#fef2f2', '#b91c1c'], ['#f0fdf4', '#15803d']
  ];
  function corDe(nome) {
    var h = 0, i;
    for (i = 0; i < (nome || '').length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
    return PALETA[h % PALETA.length];
  }

  function logoEmpresa(nome, tamanhoClasse) {
    var c = corDe(nome);
    return '<div class="' + (tamanhoClasse || 'co-logo') + '" style="background:' + c[0] + ';color:' + c[1] + '">' +
      esc(iniciais(nome)) + '</div>';
  }

  /* ---------- Toast ---------- */
  function toast(msg, tipo) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var t = document.createElement('div');
    var kind = tipo || 'ok';
    t.className = 'toast ' + kind;
    var ic = kind === 'err' ? 'xCircle' : (kind === 'info' ? 'info' : 'checkCircle');
    t.innerHTML = '<span class="toast-ico">' + global.ico(ic, 17) + '</span><span>' + esc(msg) + '</span>';
    root.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { t.remove(); }, 220);
    }, 3600);
  }

  /* ---------- Modal ---------- */
  var modalAberto = null;

  function modal(opcoes) {
    fecharModal();
    var root = document.getElementById('modal-root');
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML =
      '<div class="modal ' + (opcoes.largo ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opcoes.titulo || '') + '">' +
        '<div class="modal-head">' +
          '<div><div class="modal-title">' + esc(opcoes.titulo || '') + '</div>' +
          (opcoes.subtitulo ? '<div class="card-sub">' + esc(opcoes.subtitulo) + '</div>' : '') + '</div>' +
          '<button class="btn btn-ghost btn-icon" data-fechar aria-label="Fechar">' + global.ico('x', 17) + '</button>' +
        '</div>' +
        '<div class="modal-body">' + (opcoes.corpo || '') + '</div>' +
        (opcoes.rodape ? '<div class="modal-foot">' + opcoes.rodape + '</div>' : '') +
      '</div>';
    root.appendChild(bd);
    modalAberto = bd;

    bd.addEventListener('click', function (e) {
      if (e.target === bd || e.target.closest('[data-fechar]')) fecharModal();
    });
    document.addEventListener('keydown', escFecha);
    document.body.style.overflow = 'hidden';

    if (typeof opcoes.aoAbrir === 'function') opcoes.aoAbrir(bd.querySelector('.modal'));
    var foco = bd.querySelector('[autofocus], .modal-body input, .modal-body select, .modal-body textarea');
    if (foco) setTimeout(function () { foco.focus(); }, 60);
    return bd;
  }

  function escFecha(e) { if (e.key === 'Escape') fecharModal(); }

  function fecharModal() {
    if (modalAberto) { modalAberto.remove(); modalAberto = null; }
    document.removeEventListener('keydown', escFecha);
    document.body.style.overflow = '';
  }

  function confirmar(titulo, texto, aoConfirmar, rotulo, perigo) {
    modal({
      titulo: titulo,
      corpo: '<p style="font-size:14px;color:var(--text-soft);line-height:1.65">' + esc(texto) + '</p>',
      rodape: '<button class="btn btn-ghost" data-fechar>Cancelar</button>' +
              '<button class="btn ' + (perigo ? 'btn-danger' : 'btn-primary') + '" id="mdl-ok">' + esc(rotulo || 'Confirmar') + '</button>',
      aoAbrir: function (m) {
        m.querySelector('#mdl-ok').addEventListener('click', function () {
          fecharModal();
          aoConfirmar();
        });
      }
    });
  }

  /* ---------- Copiar ---------- */
  function copiar(texto, mensagem) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.cssText = 'position:fixed;opacity:0;top:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      toast(ok ? (mensagem || 'Copiado para a área de transferência.') : 'Não foi possível copiar automaticamente.', ok ? 'ok' : 'err');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () {
        toast(mensagem || 'Copiado para a área de transferência.');
      }).catch(fallback);
    } else fallback();
  }

  /* ---------- Score visual ---------- */
  function scoreCelula(score) {
    var f = global.Score.faixa(score);
    return '<div class="score-cell ' + f.classe + '">' +
      '<span class="score-badge">' + Math.round(score) + '<small>/100</small></span>' +
      '<span class="score-bar"><i style="width:' + score + '%"></i></span></div>';
  }

  function scoreAnel(score, tamanho) {
    var f = global.Score.faixa(score);
    var r = 54, circ = 2 * Math.PI * r;
    var off = circ * (1 - score / 100);
    var s = tamanho || 132;
    return '<div class="score-ring" style="width:' + s + 'px;height:' + s + 'px">' +
      '<svg viewBox="0 0 128 128" aria-hidden="true">' +
        '<circle cx="64" cy="64" r="' + r + '" fill="none" stroke="var(--surface-2)" stroke-width="11"/>' +
        '<circle cx="64" cy="64" r="' + r + '" fill="none" stroke="' + f.cor + '" stroke-width="11" ' +
          'stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg>' +
      '<div class="ring-val"><span class="rv-num" style="color:' + f.cor + '">' + Math.round(score) + '</span>' +
      '<span class="rv-of">de 100</span></div></div>';
  }

  function scoreBadge(score) {
    var f = global.Score.faixa(score);
    return '<span class="badge ' + f.badge + ' badge-dot">' + esc(f.nome) + '</span>';
  }

  /* ---------- Gráfico de barras (SVG, sem dependências) ---------- */
  function graficoBarras(dados, opcoes) {
    opcoes = opcoes || {};
    var w = 800, h = 210, padL = 34, padB = 26, padT = 10;
    var max = Math.max.apply(null, dados.map(function (d) { return d.valor; }).concat([1]));
    var escalaMax = Math.max(4, Math.ceil(max * 1.15));
    var n = dados.length;
    var espaco = (w - padL - 8) / n;
    var bw = Math.max(3, Math.min(26, espaco * 0.62));
    var alturaUtil = h - padB - padT;

    var barras = dados.map(function (d, i) {
      var x = padL + i * espaco + (espaco - bw) / 2;
      var bh = Math.max(d.valor > 0 ? 2 : 0, (d.valor / escalaMax) * alturaUtil);
      var y = padT + alturaUtil - bh;
      return '<rect class="bar" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + bh.toFixed(1) + '" rx="3" fill="url(#gBar)" ' +
        'data-rotulo="' + esc(d.rotulo) + '" data-valor="' + d.valor + '" data-sufixo="' + esc(opcoes.sufixo || '') + '">' +
        '<title>' + esc(d.rotulo) + ': ' + d.valor + ' ' + esc(opcoes.sufixo || '') + '</title></rect>';
    }).join('');

    var linhas = [0, 0.25, 0.5, 0.75, 1].map(function (p) {
      var y = padT + alturaUtil * (1 - p);
      var v = Math.round(escalaMax * p);
      return '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + w + '" y2="' + y.toFixed(1) +
        '" stroke="var(--border)" stroke-width="1" stroke-dasharray="' + (p === 0 ? '0' : '3 4') + '"/>' +
        '<text x="' + (padL - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="10" ' +
        'fill="var(--text-muted)" font-weight="600">' + v + '</text>';
    }).join('');

    var rotulos = dados.map(function (d, i) {
      if (n > 12 && i % Math.ceil(n / 10) !== 0 && i !== n - 1) return '';
      var x = padL + i * espaco + espaco / 2;
      return '<text x="' + x.toFixed(1) + '" y="' + (h - 7) + '" text-anchor="middle" font-size="10" ' +
        'fill="var(--text-muted)" font-weight="500">' + esc(d.rotuloCurto || d.rotulo) + '</text>';
    }).join('');

    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" ' +
      'aria-label="' + esc(opcoes.titulo || 'Gráfico de barras') + '">' +
      '<defs><linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#059669"/>' +
      '</linearGradient></defs>' + linhas + barras + rotulos + '</svg>';
  }

  /* Tooltip flutuante para as barras */
  function ativarTooltipGrafico(container) {
    if (!container) return;
    var tip = null;
    container.addEventListener('mousemove', function (e) {
      var b = e.target.closest('rect.bar');
      if (!b) { if (tip) { tip.remove(); tip = null; } return; }
      if (!tip) {
        tip = document.createElement('div');
        tip.className = 'bar-tip';
        document.body.appendChild(tip);
      }
      tip.innerHTML = '<div>' + esc(b.dataset.rotulo) + '</div><div style="opacity:.75">' +
        esc(b.dataset.valor) + ' ' + esc(b.dataset.sufixo || '') + '</div>';
      tip.style.left = (e.clientX + 14) + 'px';
      tip.style.top = (e.clientY - 42) + 'px';
    });
    container.addEventListener('mouseleave', function () { if (tip) { tip.remove(); tip = null; } });
  }

  /* ---------- Presença digital em pílulas ---------- */
  function pilulasPresenca(c) {
    var itens = [
      { k: 'Site', on: !!c.website && !c.siteFraco, txt: c.website ? (c.siteFraco ? 'Site fraco' : c.website) : 'Sem site' },
      { k: 'IG', on: !!c.instagram, txt: c.instagram || 'Instagram não encontrado' },
      { k: 'FB', on: !!c.facebook, txt: c.facebook || 'Facebook não encontrado' },
      { k: 'GMN', on: !!c.googleBusiness, txt: c.googleBusiness ? 'Google Meu Negócio ativo' : 'Sem Google Meu Negócio' }
    ];
    return '<div class="presence">' + itens.map(function (i) {
      return '<span class="pres-pill ' + (i.on ? 'on' : 'off') + '" title="' + esc(i.txt) + '">' + esc(i.k) + '</span>';
    }).join('') + '</div>';
  }

  /* ---------- Estado vazio ---------- */
  function vazio(iconeNome, titulo, texto, acaoHtml) {
    return '<div class="empty"><div class="empty-ico">' + global.ico(iconeNome, 26) + '</div>' +
      '<div class="empty-title">' + esc(titulo) + '</div>' +
      '<p class="empty-text">' + esc(texto) + '</p>' + (acaoHtml || '') + '</div>';
  }

  function esqueleto(linhas) {
    var out = '';
    for (var i = 0; i < (linhas || 5); i++) {
      out += '<div class="sk-row"><div class="skeleton" style="width:36px;height:36px;border-radius:10px"></div>' +
        '<div style="flex:1"><div class="skeleton" style="height:11px;width:' + (40 + (i * 13) % 38) + '%;margin-bottom:7px"></div>' +
        '<div class="skeleton" style="height:9px;width:26%"></div></div>' +
        '<div class="skeleton" style="width:74px;height:26px;border-radius:8px"></div></div>';
    }
    return out;
  }

  /* ---------- Delegação de eventos ---------- */
  function aoClicar(raiz, seletor, fn) {
    raiz.addEventListener('click', function (e) {
      var alvo = e.target.closest(seletor);
      if (alvo && raiz.contains(alvo)) fn(alvo, e);
    });
  }

  /* ---------- Tema ---------- */
  function aplicarTema(t) {
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }

  function alternarTema() {
    var atual = global.Store.config().tema === 'dark' ? 'light' : 'dark';
    global.Store.salvarConfig({ tema: atual });
    aplicarTema(atual);
    return atual;
  }

  global.UI = {
    esc: esc, brl: brl, brlExato: brlExato, num: num, pct: pct, data: data,
    tempoRelativo: tempoRelativo, soDigitos: soDigitos, telefoneE164: telefoneE164,
    linkWhatsApp: linkWhatsApp, iniciais: iniciais, corDe: corDe, logoEmpresa: logoEmpresa,
    toast: toast, modal: modal, fecharModal: fecharModal, confirmar: confirmar, copiar: copiar,
    scoreCelula: scoreCelula, scoreAnel: scoreAnel, scoreBadge: scoreBadge,
    graficoBarras: graficoBarras, ativarTooltipGrafico: ativarTooltipGrafico,
    pilulasPresenca: pilulasPresenca, vazio: vazio, esqueleto: esqueleto,
    aoClicar: aoClicar, aplicarTema: aplicarTema, alternarTema: alternarTema
  };
})(window);
