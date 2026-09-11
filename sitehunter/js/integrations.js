/* SiteHunter AI — Camada de integrações
   Nenhuma das integrações abaixo está conectada. Cada adaptador declara a
   interface esperada e devolve um resultado simulado, para que a troca por uma
   chamada real exija alterar apenas este arquivo.

   Regra de coleta de dados adotada pelo produto:
   - São admitidas fontes públicas e oficiais (Dados Abertos CNPJ da Receita
     Federal) e bases colaborativas com licença aberta (OpenStreetMap/ODbL).
   - São admitidas APIs de busca que ofereçam uso programático autorizado.
   - NÃO é utilizado scraping do Google Maps nem de qualquer serviço cujos
     termos de uso proíbam extração automatizada. */
(function (global) {
  'use strict';

  function naoConectado(nome, detalhe) {
    return Promise.resolve({
      ok: false,
      simulado: true,
      integracao: nome,
      mensagem: nome + ' ainda não está conectado nesta instalação.' + (detalhe ? ' ' + detalhe : '')
    });
  }

  var Integracoes = {

    /* ---- Dados Abertos CNPJ — Receita Federal ----
       Fonte oficial, redistribuição permitida. Espera-se um serviço próprio que
       ingira os arquivos públicos e exponha consulta por CNPJ/CNAE/município. */
    receitaFederal: {
      nome: 'Dados Abertos CNPJ (Receita Federal)',
      status: 'planejado',
      licenca: 'Dados públicos — Lei de Acesso à Informação',
      consultarCnpj: function (cnpj) { return naoConectado('Dados Abertos CNPJ', 'CNPJ consultado: ' + cnpj); },
      buscarPorFiltro: function (filtros) {
        /* filtros: { uf, municipio, cnae, situacao, porte } */
        return naoConectado('Dados Abertos CNPJ',
          'A busca atual usa a base de demonstração local.');
      }
    },

    /* ---- OpenStreetMap / Nominatim ----
       Licença ODbL. Exige atribuição e respeito à política de uso (1 req/s). */
    openStreetMap: {
      nome: 'OpenStreetMap (Nominatim / Overpass)',
      status: 'planejado',
      licenca: 'ODbL — atribuição obrigatória',
      geocodificar: function (endereco) { return naoConectado('OpenStreetMap', 'Endereço: ' + endereco); },
      pontosDeInteresse: function (bbox, categoria) { return naoConectado('OpenStreetMap'); },
      /* Já utilizável sem chave: link de consulta no mapa */
      linkBusca: function (endereco) {
        return 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(endereco || '');
      }
    },

    /* ---- Verificação de presença digital ----
       Checagem de existência de domínio e qualidade básica do site.
       Requer backend: o navegador não consegue inspecionar sites de terceiros
       por causa da política de mesma origem. */
    auditoriaWeb: {
      nome: 'Auditoria automatizada de site',
      status: 'planejado',
      verificarDominio: function (dominio) { return naoConectado('Auditoria de domínio'); },
      analisarSite: function (url) {
        return naoConectado('Auditoria de site',
          'A classificação de "site fraco" hoje vem dos dados cadastrados.');
      }
    },

    /* ---- Busca na web ---- */
    buscaWeb: {
      nome: 'API de busca',
      status: 'planejado',
      procurarPerfis: function (nomeEmpresa, cidade) { return naoConectado('API de busca'); }
    },

    /* ---- Supabase / PostgreSQL ----
       Esquema em db/schema.sql. Store.js é o único ponto que precisa mudar. */
    supabase: {
      nome: 'Supabase / PostgreSQL',
      status: 'planejado',
      esquema: 'db/schema.sql',
      configurar: function (url, anonKey) {
        return naoConectado('Supabase', 'Persistência atual: localStorage do navegador.');
      }
    },

    /* ---- E-mail transacional ---- */
    email: {
      nome: 'Serviço de e-mail',
      status: 'planejado',
      enviar: function (para, assunto, corpo) {
        return naoConectado('Serviço de e-mail', 'Destinatário: ' + para);
      },
      /* Funciona hoje, sem integração: abre o cliente de e-mail do usuário */
      abrirCliente: function (para, assunto, corpo) {
        var href = 'mailto:' + encodeURIComponent(para || '') +
          '?subject=' + encodeURIComponent(assunto || '') +
          '&body=' + encodeURIComponent(corpo || '');
        global.location.href = href;
        return { ok: true, metodo: 'mailto' };
      }
    },

    /* ---- WhatsApp ----
       O envio automatizado exige a API Oficial (WhatsApp Cloud API) com
       templates aprovados. O link wa.me abaixo já funciona e mantém o
       disparo sob controle humano — o que também é o comportamento adequado
       do ponto de vista de LGPD e das regras da plataforma. */
    whatsapp: {
      nome: 'WhatsApp Cloud API',
      status: 'planejado',
      enviarTemplate: function (numero, template, params) {
        return naoConectado('WhatsApp Cloud API', 'Use o link wa.me enquanto a API não está conectada.');
      },
      link: function (numero, texto) { return global.UI.linkWhatsApp(numero, texto); }
    },

    /* ---- Pagamentos ---- */
    mercadoPago: {
      nome: 'Mercado Pago',
      status: 'planejado',
      criarCobranca: function (proposta) {
        return naoConectado('Mercado Pago', 'Proposta: ' + (proposta && proposta.id));
      }
    },

    /* ---- Hospedagem das demonstrações ----
       Hoje a demonstração é gerada no navegador e aberta via Blob URL.
       Com backend, cada demo ganha uma URL pública estável. */
    hospedagemDemo: {
      nome: 'Hospedagem de demonstrações',
      status: 'planejado',
      publicar: function (demo, htmlGerado) {
        return naoConectado('Hospedagem de demonstrações',
          'O link atual abre a demonstração dentro do próprio aplicativo.');
      }
    },

    listar: function () {
      return ['receitaFederal', 'openStreetMap', 'auditoriaWeb', 'buscaWeb', 'supabase',
              'email', 'whatsapp', 'mercadoPago', 'hospedagemDemo'].map(function (k) {
        return { chave: k, nome: Integracoes[k].nome, status: Integracoes[k].status,
                 licenca: Integracoes[k].licenca || null };
      });
    }
  };

  global.Integracoes = Integracoes;
})(window);
