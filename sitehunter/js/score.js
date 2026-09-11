/* SiteHunter AI — Motor de Score de Oportunidade
   Transparente e auditável: todo ponto atribuído tem uma justificativa textual. */
(function (global) {
  'use strict';

  /* Segmentos com forte dependência de busca local / demanda digital alta */
  var SEGMENTOS_ALTA_DEMANDA = [
    'Odontologia', 'Clínica Médica', 'Estética', 'Restaurante', 'Academia',
    'Imobiliária', 'Advocacia', 'Pet Shop', 'Salão de Beleza', 'Hotelaria'
  ];
  var SEGMENTOS_MEDIA_DEMANDA = [
    'Contabilidade', 'Oficina Mecânica', 'Educação', 'Comércio Varejista', 'Construção Civil'
  ];

  /* 10 pts = segmento fortemente dependente de busca local
      6 pts = demanda digital relevante, porém menos imediata
      3 pts = demanda predominantemente B2B / indicação */
  function demandaSegmento(seg) {
    if (SEGMENTOS_ALTA_DEMANDA.indexOf(seg) !== -1) return 10;
    if (SEGMENTOS_MEDIA_DEMANDA.indexOf(seg) !== -1) return 6;
    return 3;
  }

  /* Quanto mais fragmentada a presença, maior a dor que um site resolve.
     Empresa sem nenhum canal não pontua (não há presença a centralizar). */
  function fragmentacao(c) {
    var canais = [c.website, c.instagram, c.facebook, c.googleBusiness].filter(Boolean).length;
    if (canais === 0) return 0;
    return Math.round(10 * (1 - (canais - 1) / 3) * 10) / 10;
  }

  /* ---------- Score de Oportunidade (0–100) ---------- */
  var REGRAS = [
    {
      id: 'sem_site', pts: 25,
      test: function (c) { return !c.website; },
      partial: function (c) { return c.siteFraco ? 15 : 0; },
      label: function (c) {
        if (!c.website) return 'Não possui site próprio';
        return c.siteFraco ? 'Site existente com qualidade fraca (sem HTTPS, desatualizado ou não responsivo)' : null;
      },
      labelOff: 'Já possui site próprio funcional'
    },
    {
      id: 'telefone', pts: 15,
      test: function (c) { return !!c.telefone; },
      label: 'Telefone encontrado — canal direto de contato disponível',
      labelOff: 'Telefone não encontrado'
    },
    {
      id: 'whatsapp', pts: 10,
      test: function (c) { return !!c.whatsapp; },
      label: 'WhatsApp disponível — abordagem imediata possível',
      labelOff: 'WhatsApp não identificado'
    },
    {
      id: 'email', pts: 10,
      test: function (c) { return !!c.email; },
      label: 'E-mail disponível para envio de proposta',
      labelOff: 'E-mail não encontrado'
    },
    {
      id: 'instagram', pts: 10,
      test: function (c) { return !!c.instagram; },
      label: 'Instagram ativo — já investe em presença digital',
      labelOff: 'Instagram não encontrado'
    },
    {
      id: 'ativa', pts: 10,
      test: function (c) { return (c.situacao || '').toUpperCase() === 'ATIVA'; },
      label: 'Empresa com situação cadastral ativa',
      labelOff: 'Situação cadastral não ativa'
    },
    {
      id: 'segmento', pts: 10,
      graded: function (c) { return demandaSegmento(c.segmento); },
      label: function (c) {
        var d = demandaSegmento(c.segmento);
        if (d === 10) return 'Segmento dependente de buscas locais (' + c.segmento + ')';
        if (d === 6) return 'Segmento com demanda digital relevante (' + c.segmento + ')';
        return 'Segmento com demanda digital moderada (' + c.segmento + ')';
      },
      labelOff: 'Segmento com demanda digital moderada'
    },
    {
      id: 'incompleta', pts: 10,
      graded: fragmentacao,
      label: function (c) {
        var canais = [c.website, c.instagram, c.facebook, c.googleBusiness].filter(Boolean).length;
        return 'Presença digital incompleta — ' + canais + ' de 4 canais mapeados, sem centralização em site próprio';
      },
      labelOff: 'Nenhum canal digital mapeado — não há presença a centralizar'
    }
  ];

  function resolveLabel(v, c) { return typeof v === 'function' ? v(c) : v; }

  /* Retorna { score, faixa, classe, cor, detalhes[] } */
  function calcular(c) {
    var total = 0;
    var detalhes = [];

    REGRAS.forEach(function (r) {
      var ganhos = 0;
      if (r.graded) ganhos = r.graded(c) || 0;
      else if (r.test(c)) ganhos = r.pts;
      else if (r.partial) ganhos = r.partial(c) || 0;

      var txt = ganhos > 0 ? resolveLabel(r.label, c) : resolveLabel(r.labelOff, c);
      total += ganhos;
      detalhes.push({ id: r.id, pts: ganhos, max: r.pts, texto: txt || resolveLabel(r.labelOff, c) });
    });

    total = Math.max(0, Math.min(100, Math.round(total)));
    var f = faixa(total);
    return { score: total, faixa: f.nome, classe: f.classe, cor: f.cor, detalhes: detalhes };
  }

  function faixa(s) {
    if (s >= 90) return { nome: 'Oportunidade excepcional', curto: 'Excepcional', classe: 's-exceptional', cor: '#059669', badge: 'badge-emerald' };
    if (s >= 75) return { nome: 'Alta oportunidade', curto: 'Alta', classe: 's-high', cor: '#0d9488', badge: 'badge-emerald' };
    if (s >= 60) return { nome: 'Boa oportunidade', curto: 'Boa', classe: 's-good', cor: '#0284c7', badge: 'badge-sky' };
    if (s >= 40) return { nome: 'Média oportunidade', curto: 'Média', classe: 's-medium', cor: '#d97706', badge: 'badge-amber' };
    return { nome: 'Baixa oportunidade', curto: 'Baixa', classe: 's-low', cor: '#7b8797', badge: 'badge-gray' };
  }

  /* ---------- Índice de Presença Digital (0–100) ----------
     Mede o quanto a empresa JÁ está presente digitalmente.
     Quanto menor, maior a oportunidade de venda de site.               */
  var PRESENCA = [
    { id: 'website', peso: 30, rotulo: 'Website próprio', test: function (c) { return !!c.website && !c.siteFraco; }, meio: function (c) { return !!c.website && c.siteFraco; } },
    { id: 'dominio', peso: 12, rotulo: 'Domínio próprio', test: function (c) { return !!c.dominioProprio; } },
    { id: 'google', peso: 13, rotulo: 'Google Business', test: function (c) { return !!c.googleBusiness; } },
    { id: 'instagram', peso: 15, rotulo: 'Instagram', test: function (c) { return !!c.instagram; } },
    { id: 'facebook', peso: 10, rotulo: 'Facebook', test: function (c) { return !!c.facebook; } },
    { id: 'whatsapp', peso: 8, rotulo: 'WhatsApp', test: function (c) { return !!c.whatsapp; } },
    { id: 'telefone', peso: 7, rotulo: 'Telefone público', test: function (c) { return !!c.telefone; } },
    { id: 'email', peso: 5, rotulo: 'E-mail de contato', test: function (c) { return !!c.email; } }
  ];

  function presencaDigital(c) {
    var total = 0, itens = [];
    PRESENCA.forEach(function (p) {
      var estado = 'ausente', ganho = 0;
      if (p.test(c)) { estado = 'ok'; ganho = p.peso; }
      else if (p.meio && p.meio(c)) { estado = 'fraco'; ganho = Math.round(p.peso * 0.4); }
      total += ganho;
      itens.push({ id: p.id, rotulo: p.rotulo, estado: estado, pts: ganho, max: p.peso });
    });
    total = Math.min(100, Math.round(total));
    return { indice: total, itens: itens, recomendacao: recomendar(c, total) };
  }

  function recomendar(c, indice) {
    if (!c.website && indice <= 55) {
      return 'Empresa com forte potencial para aquisição de site institucional. ' +
        'Já possui canais de contato ativos, mas nenhum endereço próprio na internet que centralize a operação.';
    }
    if (!c.website) {
      return 'Empresa sem site próprio, porém com presença digital relativamente estruturada. ' +
        'Abordagem indicada: site institucional como centralizador dos canais já existentes.';
    }
    if (c.siteFraco) {
      return 'Empresa possui site, mas com indicadores de baixa qualidade técnica. ' +
        'Abordagem indicada: proposta de reformulação com foco em desempenho, responsividade e conversão.';
    }
    return 'Empresa com presença digital consolidada. Potencial menor para venda de site institucional — ' +
      'avaliar serviços complementares (landing pages, otimização, integrações).';
  }

  /* Valor potencial estimado do negócio, derivado do score e do porte informado */
  function valorPotencial(c) {
    var base = 597;
    var s = (c.score != null ? c.score : calcular(c).score);
    if (s >= 90) base = 1497;
    else if (s >= 75) base = 997;
    else if (s >= 60) base = 797;
    if (c.porte === 'MEDIO') base = Math.round(base * 1.35 / 10) * 10;
    if (c.porte === 'GRANDE') base = Math.round(base * 1.8 / 10) * 10;
    return base;
  }

  global.Score = {
    calcular: calcular,
    faixa: faixa,
    presencaDigital: presencaDigital,
    valorPotencial: valorPotencial,
    segmentosAltaDemanda: SEGMENTOS_ALTA_DEMANDA,
    demandaSegmento: demandaSegmento,
    regras: REGRAS
  };
})(window);
