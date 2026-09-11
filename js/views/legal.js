/* SiteHunter AI — Documentos legais (LGPD) */
(function (global) {
  'use strict';
  global.Views = global.Views || {};

  var HOJE = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  var DOCS = {
    privacidade: { titulo: 'Política de Privacidade', icone: 'shield', corpo: privacidade },
    termos:      { titulo: 'Termos de Uso',           icone: 'doc',    corpo: termos },
    dados:       { titulo: 'Origem dos dados',        icone: 'layers', corpo: origemDados },
    remocao:     { titulo: 'Remoção e opt-out',       icone: 'trash',  corpo: remocao }
  };

  global.Views.legal = function (root, params) {
    var ui = global.UI;
    var doc = DOCS[params.doc] || DOCS.privacidade;
    var logado = global.Store.autenticado();

    root.innerHTML =
      '<div class="lp">' +
      '<nav class="lp-nav"><div class="lp-nav-in">' +
        '<a href="#/" class="lp-brand">' +
          '<span class="brand-mark">' + global.ico('radar', 19) + '</span>' +
          '<span class="brand-name">SiteHunter<span>Prospecção digital</span></span></a>' +
        '<div class="lp-nav-cta">' +
          (logado
            ? '<a href="#/app/visao-geral" class="btn btn-primary">Voltar ao aplicativo</a>'
            : '<a href="#/entrar" class="btn btn-ghost">Entrar</a>' +
              '<a href="#/criar-conta" class="btn btn-primary">Criar conta</a>') +
        '</div>' +
      '</div></nav>' +

      '<div class="lp-section"><div class="legal-doc">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px">' +
          Object.keys(DOCS).map(function (k) {
            return '<a class="chip ' + (k === params.doc ? 'active' : '') + '" href="#/legal/' + k + '">' +
              global.ico(DOCS[k].icone, 14) + ' ' + ui.esc(DOCS[k].titulo) + '</a>';
          }).join('') +
        '</div>' +
        '<h1 class="page-title" style="font-size:30px">' + ui.esc(doc.titulo) + '</h1>' +
        '<p class="hint" style="margin-top:8px">Última atualização: ' + HOJE + '</p>' +
        '<div style="margin-top:26px">' + doc.corpo() + '</div>' +
      '</div></div>' +

      '<footer class="lp-foot"><div class="lp-foot-bot" style="margin-top:0;border:0;padding-top:0">' +
        '<span>© ' + new Date().getFullYear() + ' SiteHunter AI — nome provisório do produto.</span>' +
        '<span><a href="#/">Voltar à página inicial</a></span>' +
      '</div></footer></div>';
  };

  function aviso(texto) {
    return '<div class="rec-box" style="margin-bottom:24px">' + global.ico('info', 18) +
      '<p>' + texto + '</p></div>';
  }

  /* ---------------- Política de Privacidade ---------------- */
  function privacidade() {
    return aviso('Este documento descreve o funcionamento real da versão atual do produto, em que os dados ' +
      'ficam exclusivamente no seu navegador. Ao conectar um backend, a política deve ser revista por ' +
      'assessoria jurídica antes da operação comercial.') +

    '<h2>1. Quem é o controlador</h2>' +
    '<p>O operador desta instalação do SiteHunter AI é o responsável pelos dados nela tratados. ' +
    'Como o aplicativo funciona inteiramente no navegador do usuário, é o próprio usuário quem controla ' +
    'os dados de prospecção que carrega ou gera.</p>' +

    '<h2>2. Quais dados são tratados</h2>' +
    '<p>O aplicativo trata duas categorias distintas:</p>' +
    '<ul>' +
      '<li><strong>Dados da sua conta:</strong> nome, e-mail e uma credencial de acesso, usados apenas ' +
      'para identificar sua sessão local.</li>' +
      '<li><strong>Dados de empresas prospectadas:</strong> razão social, nome fantasia, CNPJ, CNAE, ' +
      'endereço, telefone, e-mail comercial e perfis públicos em redes sociais. São dados de pessoa ' +
      'jurídica ou de contato profissional divulgado publicamente pela própria empresa.</li>' +
    '</ul>' +
    '<p>A base de demonstração que acompanha o produto é composta exclusivamente por empresas fictícias. ' +
    'Nenhum CNPJ, telefone ou e-mail dela corresponde a um registro real.</p>' +

    '<h2>3. Base legal</h2>' +
    '<p>Quando dados de contato profissional envolvem pessoa natural (por exemplo, um empresário individual), ' +
    'o tratamento se apoia no <strong>legítimo interesse</strong> (LGPD, art. 7º, IX) para prospecção ' +
    'comercial B2B, sempre limitado ao necessário e com oferta permanente de oposição — o opt-out descrito ' +
    'na seção 7.</p>' +

    '<h2>4. Onde os dados ficam</h2>' +
    '<p>Na versão atual, todos os registros são gravados no <code>localStorage</code> do seu navegador. ' +
    'Nada é transmitido para servidores do produto, porque não há servidor. Limpar os dados do navegador ' +
    'apaga tudo de forma irreversível.</p>' +

    '<h2>5. Compartilhamento</h2>' +
    '<p>Não há compartilhamento com terceiros. As integrações previstas (Receita Federal, OpenStreetMap, ' +
    'Supabase, serviço de e-mail, WhatsApp e Mercado Pago) estão desconectadas — quando alguma for ativada, ' +
    'esta política será atualizada indicando qual dado transita e para onde.</p>' +

    '<h2>6. Comunicações</h2>' +
    '<p>O aplicativo <strong>não dispara mensagens automaticamente</strong>. Ele redige a mensagem e abre ' +
    'seu WhatsApp ou cliente de e-mail: o envio é sempre um ato seu, no seu canal, sob sua responsabilidade.</p>' +

    '<h2>7. Seus direitos</h2>' +
    '<p>Você pode, a qualquer momento, confirmar a existência de tratamento, acessar, corrigir, anonimizar, ' +
    'portar ou eliminar os dados (LGPD, art. 18). Na prática: <em>Configurações → Dados locais</em> permite ' +
    'exportar tudo em JSON e apagar tudo. Empresas listadas podem pedir remoção pelo procedimento de ' +
    '<a href="#/legal/remocao" class="link">Remoção e opt-out</a>.</p>' +

    '<h2>8. Segurança</h2>' +
    '<p>A credencial local existe apenas para separar contas no mesmo navegador e não constitui proteção ' +
    'criptográfica. Não armazene informações sensíveis nesta versão. A autenticação de produção deve ser ' +
    'feita no servidor.</p>' +

    '<h2>9. Contato</h2>' +
    '<p>Dúvidas sobre privacidade devem ser dirigidas ao responsável por esta instalação, cujo contato ' +
    'aparece nas propostas emitidas e pode ser configurado em <em>Configurações → Perfil</em>.</p>';
  }

  /* ---------------- Termos de Uso ---------------- */
  function termos() {
    return aviso('Documento-modelo que descreve o funcionamento atual do produto. Antes de comercializar, ' +
      'submeta-o a revisão jurídica.') +

    '<h2>1. Objeto</h2>' +
    '<p>O SiteHunter AI é uma ferramenta de apoio à prospecção comercial. Ele organiza dados de empresas, ' +
    'calcula um score de oportunidade, gera páginas de demonstração e textos de abordagem, e acompanha ' +
    'negociações em um CRM.</p>' +

    '<h2>2. O que o produto não faz</h2>' +
    '<ul>' +
      '<li>Não realiza raspagem do Google Maps nem de serviços cujos termos de uso a proíbam.</li>' +
      '<li>Não envia mensagens em massa nem dispara comunicações automaticamente.</li>' +
      '<li>Não garante resultado comercial: o score é uma priorização, não uma previsão de venda.</li>' +
    '</ul>' +

    '<h2>3. Responsabilidades do usuário</h2>' +
    '<p>Ao importar listas próprias, você declara ter base legal para tratar aqueles dados. É sua a ' +
    'responsabilidade pelo conteúdo enviado aos contatos, pelo respeito às regras das plataformas de ' +
    'mensagem utilizadas e pelo cumprimento da legislação aplicável, incluindo a LGPD e o Código de ' +
    'Defesa do Consumidor.</p>' +

    '<h2>4. Páginas de demonstração</h2>' +
    '<p>As páginas geradas são propostas visuais. Elas trazem selo permanente identificando essa condição, ' +
    'não são indexadas por buscadores e não devem ser apresentadas como site oficial de qualquer empresa. ' +
    'Depoimentos são marcados como exemplos ilustrativos e o produto não fabrica avaliações, prêmios ou ' +
    'números de clientes.</p>' +

    '<h2>5. Textos gerados</h2>' +
    '<p>As abordagens usam apenas dados cadastrados da empresa. Ainda assim, revise cada mensagem antes de ' +
    'enviar: a responsabilidade pelo conteúdo transmitido é de quem envia.</p>' +

    '<h2>6. Disponibilidade e dados</h2>' +
    '<p>Nesta versão, os dados residem no seu navegador. Não há backup automático. Limpar o armazenamento ' +
    'do navegador, usar navegação anônima ou trocar de dispositivo resulta em perda dos dados. Use ' +
    '<em>Configurações → Dados locais → Exportar</em> regularmente.</p>' +

    '<h2>7. Propriedade intelectual</h2>' +
    '<p>O código e a identidade do SiteHunter AI pertencem ao seu titular. Os conteúdos que você produz ' +
    'com a ferramenta (propostas, textos, demonstrações) pertencem a você.</p>' +

    '<h2>8. Alterações</h2>' +
    '<p>Estes termos podem ser atualizados a qualquer momento. Alterações relevantes serão comunicadas ' +
    'dentro do aplicativo.</p>';
  }

  /* ---------------- Origem dos dados ---------------- */
  function origemDados() {
    return aviso('Transparência sobre de onde vem cada informação exibida no Radar de Empresas.') +

    '<h2>Base atual: demonstração</h2>' +
    '<p>As 30 empresas que acompanham o produto são <strong>inteiramente fictícias</strong>. Nomes, CNPJs, ' +
    'endereços, telefones e e-mails foram criados para demonstrar a ferramenta e não correspondem a ' +
    'registros reais. Elas estão declaradas em <code>js/data.js</code>.</p>' +

    '<h2>Fontes previstas para a operação real</h2>' +
    '<h3>Dados Abertos CNPJ — Receita Federal</h3>' +
    '<p>Base pública oficial do Cadastro Nacional da Pessoa Jurídica, disponibilizada pela Receita Federal ' +
    'para download e redistribuição. Fornece razão social, nome fantasia, CNAE, situação cadastral, data de ' +
    'abertura, endereço e, quando declarados, telefone e e-mail.</p>' +

    '<h3>OpenStreetMap</h3>' +
    '<p>Base cartográfica colaborativa sob licença ODbL, que exige atribuição. Usada para geocodificação ' +
    'e localização de estabelecimentos, respeitando a política de uso do serviço.</p>' +

    '<h3>APIs de busca</h3>' +
    '<p>Serviços de busca com uso programático autorizado, para localizar perfis públicos em redes sociais ' +
    'e verificar a existência de site próprio.</p>' +

    '<h3>Listas importadas pelo usuário</h3>' +
    '<p>Arquivos CSV que você mesmo carrega. A responsabilidade pela base legal desses dados é de quem ' +
    'importa.</p>' +

    '<h2>O que não é usado</h2>' +
    '<ul>' +
      '<li>Raspagem do Google Maps ou de qualquer serviço cujos termos de uso a proíbam.</li>' +
      '<li>Compra de listas de origem desconhecida.</li>' +
      '<li>Dados pessoais sensíveis (LGPD, art. 5º, II).</li>' +
      '<li>Dados obtidos por acesso não autorizado a sistemas.</li>' +
    '</ul>' +

    '<h2>Como o score é calculado</h2>' +
    '<p>O score de oportunidade é uma heurística transparente: cada ponto vem de uma regra declarada e ' +
    'verificável, listada na aba <em>"Por que este score?"</em> de cada empresa. Não há modelo opaco por ' +
    'trás — as regras estão em <code>js/score.js</code> e podem ser auditadas.</p>';
  }

  /* ---------------- Remoção e opt-out ---------------- */
  function remocao() {
    return aviso('Qualquer empresa listada pode pedir correção ou remoção dos seus dados, e qualquer ' +
      'contato pode pedir para não receber comunicações. Os dois pedidos são atendidos de forma independente.') +

    '<h2>Solicitação de remoção de registro</h2>' +
    '<p>Para remover uma empresa da base desta instalação, o pedido deve ser dirigido ao responsável pela ' +
    'instalação, informando:</p>' +
    '<ul>' +
      '<li>Razão social ou nome fantasia da empresa;</li>' +
      '<li>CNPJ, quando disponível;</li>' +
      '<li>Se o pedido é de <strong>correção</strong> de um dado específico ou de <strong>exclusão</strong> ' +
      'integral do registro.</li>' +
    '</ul>' +
    '<p>Pedidos de exclusão são atendidos em até 15 dias. Não é exigida justificativa.</p>' +

    '<h2>Opt-out de comunicações</h2>' +
    '<p>Um contato que peça para não ser mais abordado deve ser registrado em ' +
    '<em>Configurações → Privacidade → Opt-out</em>. A partir daí, o aplicativo <strong>bloqueia o envio</strong> ' +
    'de abordagens e demonstrações para aquele telefone ou e-mail, exibindo um aviso em vez do botão de envio.</p>' +
    '<p>O opt-out é permanente e independe de o registro da empresa continuar na base.</p>' +

    '<h2>Boas práticas de abordagem</h2>' +
    '<ul>' +
      '<li>Identifique-se na primeira mensagem: nome e empresa.</li>' +
      '<li>Deixe claro como você chegou até aquele contato.</li>' +
      '<li>Ofereça a saída já no primeiro contato — uma frase basta.</li>' +
      '<li>Respeite um pedido de "não quero" na primeira vez em que ele for feito.</li>' +
      '<li>Não insista em contatos que não responderam a duas abordagens.</li>' +
    '</ul>' +

    '<h2>Exclusão dos seus próprios dados</h2>' +
    '<p>Se você é usuário do aplicativo e quer apagar sua conta e todo o histórico, vá em ' +
    '<em>Configurações → Dados locais → Apagar todos os dados</em>. A remoção é imediata e irreversível. ' +
    'Antes disso, considere exportar um backup em JSON.</p>';
  }
})(window);
