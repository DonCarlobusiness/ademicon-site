/* SiteHunter AI — Base de demonstração
   ATENÇÃO: todos os registros abaixo são FICTÍCIOS, criados apenas para
   demonstração do produto. Nenhum dado real de pessoa ou empresa é utilizado.
   CNPJs, telefones e e-mails não correspondem a registros existentes. */
(function (global) {
  'use strict';

  var SEGMENTOS = [
    'Odontologia', 'Clínica Médica', 'Estética', 'Oficina Mecânica', 'Restaurante',
    'Transportadora', 'Contabilidade', 'Advocacia', 'Academia', 'Imobiliária',
    'Comércio Varejista', 'Pet Shop', 'Salão de Beleza', 'Construção Civil',
    'Agronegócio', 'Hotelaria', 'Educação', 'Serviços Gerais'
  ];

  var CNAES = [
    { cod: '8630-5/04', desc: 'Atividade odontológica' },
    { cod: '8630-5/03', desc: 'Atividade médica ambulatorial' },
    { cod: '9602-5/02', desc: 'Atividades de estética e cuidados com a beleza' },
    { cod: '4520-0/01', desc: 'Serviços de manutenção e reparação mecânica de veículos' },
    { cod: '5611-2/01', desc: 'Restaurantes e similares' },
    { cod: '4930-2/02', desc: 'Transporte rodoviário de carga, exceto produtos perigosos' },
    { cod: '6920-6/01', desc: 'Atividades de contabilidade' },
    { cod: '6911-7/01', desc: 'Serviços advocatícios' },
    { cod: '9313-1/00', desc: 'Atividades de condicionamento físico' },
    { cod: '6821-8/01', desc: 'Corretagem na compra e venda e avaliação de imóveis' },
    { cod: '4781-4/00', desc: 'Comércio varejista de artigos do vestuário' },
    { cod: '4789-0/04', desc: 'Comércio varejista de animais vivos e artigos para animais' },
    { cod: '9602-5/01', desc: 'Cabeleireiros, manicure e pedicure' },
    { cod: '4120-4/00', desc: 'Construção de edifícios' },
    { cod: '0111-3/02', desc: 'Cultivo de milho' },
    { cod: '5510-8/01', desc: 'Hotéis' },
    { cod: '8599-6/04', desc: 'Treinamento em desenvolvimento profissional e gerencial' },
    { cod: '8121-4/00', desc: 'Limpeza em prédios e em domicílios' }
  ];

  var UFS = [
    { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' }, { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' }, { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' }
  ];

  var PACOTES = [
    {
      id: 'essencial', nome: 'SITE ESSENCIAL', valor: 597, prazo: '7 dias úteis',
      itens: ['Site institucional de página única', 'Layout responsivo (celular e desktop)', 'Botão de WhatsApp integrado',
              'Formulário de contato', 'Otimização básica para buscadores', 'Hospedagem no primeiro ano']
    },
    {
      id: 'profissional', nome: 'SITE PROFISSIONAL', valor: 997, prazo: '12 dias úteis', destaque: true,
      itens: ['Até 5 páginas internas', 'Layout responsivo e identidade personalizada', 'Catálogo de serviços',
              'Integração com WhatsApp e redes sociais', 'Google Meu Negócio configurado', 'SEO local otimizado',
              'Hospedagem e domínio no primeiro ano', '30 dias de ajustes inclusos']
    },
    {
      id: 'premium', nome: 'SITE PREMIUM', valor: 1497, prazo: '20 dias úteis',
      itens: ['Site completo com páginas ilimitadas', 'Design exclusivo sob medida', 'Blog integrado',
              'Área de agendamento ou orçamento online', 'SEO avançado e performance otimizada',
              'Integração com Google Analytics', 'Hospedagem, domínio e e-mail profissional',
              '90 dias de suporte e ajustes']
    }
  ];

  var ESTAGIOS = [
    { id: 'novo',      nome: 'NOVO LEAD',   cor: '#7b8797' },
    { id: 'analisado', nome: 'ANALISADO',   cor: '#0284c7' },
    { id: 'demo',      nome: 'DEMO CRIADA', cor: '#7c3aed' },
    { id: 'contatado', nome: 'CONTATADO',   cor: '#0891b2' },
    { id: 'respondeu', nome: 'RESPONDEU',   cor: '#d97706' },
    { id: 'reuniao',   nome: 'REUNIÃO',     cor: '#db2777' },
    { id: 'proposta',  nome: 'PROPOSTA',    cor: '#4f46e5' },
    { id: 'fechado',   nome: 'FECHADO',     cor: '#059669' },
    { id: 'perdido',   nome: 'PERDIDO',     cor: '#e11d48' }
  ];

  /* ---------- Empresas fictícias ---------- */
  function e(o) { return o; }

  var EMPRESAS = [
    e({ id: 'c001', nome: 'CLÍNICA SORRISO ODONTOLOGIA', razaoSocial: 'Sorriso Serviços Odontológicos Ltda',
      cnpj: '41.882.507/0001-64', cnae: '8630-5/04', segmento: 'Odontologia', abertura: '2016-03-14',
      cidade: 'Luís Eduardo Magalhães', uf: 'BA', bairro: 'Centro', endereco: 'Av. Barreiras, 1420, Sala 3', cep: '47850-000',
      telefone: '(77) 3628-4410', whatsapp: '(77) 99812-4410', email: 'contato@clinicasorriso-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: '@clinicasorriso.lem', facebook: null,
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Clínico geral', 'Ortodontia', 'Implantes', 'Clareamento dental', 'Odontopediatria'] }),

    e({ id: 'c002', nome: 'AUTO CENTER OESTE', razaoSocial: 'Oeste Manutenção Automotiva Ltda',
      cnpj: '28.104.663/0001-08', cnae: '4520-0/01', segmento: 'Oficina Mecânica', abertura: '2013-08-02',
      cidade: 'Luís Eduardo Magalhães', uf: 'BA', bairro: 'Distrito Industrial', endereco: 'Rua das Oficinas, 305', cep: '47850-000',
      telefone: '(77) 3627-1180', whatsapp: '(77) 99640-1180', email: null,
      website: null, siteFraco: false, dominioProprio: false, instagram: '@autocenteroeste', facebook: 'autocenteroeste',
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Mecânica geral', 'Suspensão', 'Injeção eletrônica', 'Troca de óleo', 'Alinhamento e balanceamento'] }),

    e({ id: 'c003', nome: 'TRANSPORTES CERRADO LOGÍSTICA', razaoSocial: 'Cerrado Transportes e Logística Ltda',
      cnpj: '33.507.921/0001-45', cnae: '4930-2/02', segmento: 'Transportadora', abertura: '2011-01-20',
      cidade: 'Luís Eduardo Magalhães', uf: 'BA', bairro: 'BR-020, Km 4', endereco: 'Rodovia BR-020, Km 4, Galpão 7', cep: '47850-000',
      telefone: '(77) 3629-7700', whatsapp: null, email: 'comercial@cerradolog-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: null, facebook: 'cerradologistica',
      googleBusiness: true, situacao: 'ATIVA', porte: 'MEDIO',
      servicos: ['Transporte de grãos', 'Carga fracionada', 'Armazenagem', 'Logística agrícola'] }),

    e({ id: 'c004', nome: 'RESTAURANTE SABOR DA TERRA', razaoSocial: 'Sabor da Terra Alimentação Ltda',
      cnpj: '19.442.880/0001-72', cnae: '5611-2/01', segmento: 'Restaurante', abertura: '2018-06-11',
      cidade: 'Barreiras', uf: 'BA', bairro: 'Centro', endereco: 'Rua Osvaldo Cruz, 88', cep: '47800-000',
      telefone: '(77) 3611-2204', whatsapp: '(77) 99155-2204', email: null,
      website: null, siteFraco: false, dominioProprio: false, instagram: '@sabordaterra.barreiras', facebook: null,
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Almoço executivo', 'Buffet self-service', 'Marmitex', 'Eventos e confraternizações'] }),

    e({ id: 'c005', nome: 'ESCRITÓRIO MARTINS CONTABILIDADE', razaoSocial: 'Martins Assessoria Contábil Ltda',
      cnpj: '07.336.155/0001-30', cnae: '6920-6/01', segmento: 'Contabilidade', abertura: '2007-02-28',
      cidade: 'Goiânia', uf: 'GO', bairro: 'Setor Bueno', endereco: 'Av. T-9, 1200, Sala 806', cep: '74230-000',
      telefone: '(62) 3241-5580', whatsapp: '(62) 99418-5580', email: 'contato@martinscontabil-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: '@martinscontabilidade', facebook: null,
      googleBusiness: false, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Abertura de empresas', 'Escrituração fiscal', 'Folha de pagamento', 'Consultoria tributária', 'Imposto de renda'] }),

    e({ id: 'c006', nome: 'ADVOCACIA REIS & ASSOCIADOS', razaoSocial: 'Reis Sociedade Individual de Advocacia',
      cnpj: '25.770.418/0001-19', cnae: '6911-7/01', segmento: 'Advocacia', abertura: '2015-09-17',
      cidade: 'Uberlândia', uf: 'MG', bairro: 'Centro', endereco: 'Av. João Naves de Ávila, 2340, Cj. 1204', cep: '38400-000',
      telefone: '(34) 3214-9080', whatsapp: '(34) 99702-9080', email: 'contato@reisadv-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: '@reisadvocacia', facebook: 'reisadvocacia',
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Direito trabalhista', 'Direito civil', 'Direito empresarial', 'Direito previdenciário'] }),

    e({ id: 'c007', nome: 'ACADEMIA MOVIMENTO FIT', razaoSocial: 'Movimento Fit Atividades Físicas Ltda',
      cnpj: '36.912.044/0001-51', cnae: '9313-1/00', segmento: 'Academia', abertura: '2019-11-05',
      cidade: 'Palmas', uf: 'TO', bairro: 'Plano Diretor Sul', endereco: 'Quadra 405 Sul, Lote 12', cep: '77015-000',
      telefone: '(63) 3215-4422', whatsapp: '(63) 99204-4422', email: null,
      website: null, siteFraco: false, dominioProprio: false, instagram: '@movimentofit.palmas', facebook: null,
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Musculação', 'Treino funcional', 'Aulas coletivas', 'Avaliação física', 'Personal trainer'] }),

    e({ id: 'c008', nome: 'IMOBILIÁRIA HORIZONTE', razaoSocial: 'Horizonte Negócios Imobiliários Ltda',
      cnpj: '12.558.903/0001-27', cnae: '6821-8/01', segmento: 'Imobiliária', abertura: '2010-04-22',
      cidade: 'Cuiabá', uf: 'MT', bairro: 'Jardim Aclimação', endereco: 'Rua Marechal Deodoro, 715', cep: '78050-000',
      telefone: '(65) 3322-6690', whatsapp: '(65) 99631-6690', email: 'atendimento@horizonteimoveis-demo.com.br',
      website: 'horizonteimoveis-demo.com.br', siteFraco: true, dominioProprio: true, instagram: '@horizonteimoveis', facebook: 'horizonteimoveis',
      googleBusiness: true, situacao: 'ATIVA', porte: 'MEDIO',
      servicos: ['Venda de imóveis', 'Locação', 'Administração de aluguéis', 'Avaliação imobiliária'] }),

    e({ id: 'c009', nome: 'PET SHOP AMIGO FIEL', razaoSocial: 'Amigo Fiel Comércio de Produtos para Animais Ltda',
      cnpj: '29.640.117/0001-86', cnae: '4789-0/04', segmento: 'Pet Shop', abertura: '2017-07-30',
      cidade: 'Campo Grande', uf: 'MS', bairro: 'Santa Fé', endereco: 'Rua Rui Barbosa, 2044', cep: '79021-000',
      telefone: '(67) 3384-7712', whatsapp: '(67) 99172-7712', email: null,
      website: null, siteFraco: false, dominioProprio: false, instagram: '@petamigofiel.cg', facebook: null,
      googleBusiness: false, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Banho e tosa', 'Ração e acessórios', 'Consulta veterinária', 'Vacinação', 'Hotel para pets'] }),

    e({ id: 'c010', nome: 'STUDIO BELA ESTÉTICA', razaoSocial: 'Bela Estética e Bem-Estar Ltda',
      cnpj: '38.201.774/0001-05', cnae: '9602-5/02', segmento: 'Estética', abertura: '2020-02-18',
      cidade: 'Ribeirão Preto', uf: 'SP', bairro: 'Jardim Irajá', endereco: 'Av. Professor João Fiúsa, 900, Sala 22', cep: '14024-000',
      telefone: '(16) 3620-8840', whatsapp: '(16) 99745-8840', email: 'contato@studiobela-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: '@studiobela.rp', facebook: 'studiobelarp',
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Limpeza de pele', 'Massagem modeladora', 'Depilação a laser', 'Design de sobrancelhas', 'Drenagem linfática'] }),

    e({ id: 'c011', nome: 'CONSTRUTORA PILAR NORTE', razaoSocial: 'Pilar Norte Engenharia e Construções Ltda',
      cnpj: '16.883.290/0001-74', cnae: '4120-4/00', segmento: 'Construção Civil', abertura: '2012-10-09',
      cidade: 'Teresina', uf: 'PI', bairro: 'Jóquei', endereco: 'Rua Areolino de Abreu, 1500', cep: '64049-000',
      telefone: '(86) 3233-9010', whatsapp: null, email: 'obras@pilarnorte-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: null, facebook: null,
      googleBusiness: false, situacao: 'ATIVA', porte: 'MEDIO',
      servicos: ['Construção residencial', 'Reformas comerciais', 'Gerenciamento de obras', 'Projetos estruturais'] }),

    e({ id: 'c012', nome: 'SALÃO ESTILO & ARTE', razaoSocial: 'Estilo e Arte Cabeleireiros Ltda',
      cnpj: '31.004.556/0001-93', cnae: '9602-5/01', segmento: 'Salão de Beleza', abertura: '2018-01-25',
      cidade: 'Fortaleza', uf: 'CE', bairro: 'Aldeota', endereco: 'Rua Silva Jatahy, 320', cep: '60165-000',
      telefone: '(85) 3264-3311', whatsapp: '(85) 98806-3311', email: null,
      website: null, siteFraco: false, dominioProprio: false, instagram: '@estiloearte.fortaleza', facebook: null,
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Corte e escova', 'Coloração', 'Progressiva', 'Manicure e pedicure', 'Penteados para eventos'] }),

    e({ id: 'c013', nome: 'CLÍNICA VIDA PLENA', razaoSocial: 'Vida Plena Serviços Médicos Ltda',
      cnpj: '22.115.708/0001-38', cnae: '8630-5/03', segmento: 'Clínica Médica', abertura: '2014-05-06',
      cidade: 'Londrina', uf: 'PR', bairro: 'Centro', endereco: 'Av. Higienópolis, 1100, 4º andar', cep: '86020-000',
      telefone: '(43) 3323-7744', whatsapp: '(43) 99884-7744', email: 'agenda@vidaplena-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: '@clinicavidaplena', facebook: 'clinicavidaplena',
      googleBusiness: true, situacao: 'ATIVA', porte: 'MEDIO',
      servicos: ['Clínica geral', 'Cardiologia', 'Endocrinologia', 'Exames laboratoriais', 'Check-up executivo'] }),

    e({ id: 'c014', nome: 'MODA VIVA BOUTIQUE', razaoSocial: 'Moda Viva Comércio de Confecções Ltda',
      cnpj: '27.889.310/0001-60', cnae: '4781-4/00', segmento: 'Comércio Varejista', abertura: '2016-11-12',
      cidade: 'Recife', uf: 'PE', bairro: 'Boa Viagem', endereco: 'Av. Conselheiro Aguiar, 2500, Loja 14', cep: '51020-000',
      telefone: '(81) 3325-4180', whatsapp: '(81) 99612-4180', email: null,
      website: null, siteFraco: false, dominioProprio: false, instagram: '@modaviva.recife', facebook: null,
      googleBusiness: false, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Moda feminina', 'Moda praia', 'Acessórios', 'Consultoria de imagem'] }),

    e({ id: 'c015', nome: 'AGRO SEMENTES PLANALTO', razaoSocial: 'Planalto Comércio de Insumos Agrícolas Ltda',
      cnpj: '18.663.441/0001-22', cnae: '0111-3/02', segmento: 'Agronegócio', abertura: '2009-03-30',
      cidade: 'Luís Eduardo Magalhães', uf: 'BA', bairro: 'Zona Rural', endereco: 'Rodovia BA-460, Km 12', cep: '47850-000',
      telefone: '(77) 3628-9900', whatsapp: '(77) 99927-9900', email: 'vendas@agroplanalto-demo.com.br',
      website: 'agroplanalto-demo.com.br', siteFraco: false, dominioProprio: true, instagram: '@agroplanalto', facebook: 'agroplanalto',
      googleBusiness: true, situacao: 'ATIVA', porte: 'GRANDE',
      servicos: ['Sementes certificadas', 'Defensivos agrícolas', 'Fertilizantes', 'Consultoria agronômica'] }),

    e({ id: 'c016', nome: 'HOTEL PORTAL DO CERRADO', razaoSocial: 'Portal do Cerrado Hotelaria Ltda',
      cnpj: '24.330.982/0001-47', cnae: '5510-8/01', segmento: 'Hotelaria', abertura: '2013-12-03',
      cidade: 'Luís Eduardo Magalhães', uf: 'BA', bairro: 'Centro', endereco: 'Av. Ipê Amarelo, 780', cep: '47850-000',
      telefone: '(77) 3625-3300', whatsapp: '(77) 99310-3300', email: 'reservas@portalcerrado-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: '@hotelportalcerrado', facebook: 'hotelportalcerrado',
      googleBusiness: true, situacao: 'ATIVA', porte: 'MEDIO',
      servicos: ['Hospedagem executiva', 'Café da manhã incluso', 'Sala de reuniões', 'Estacionamento coberto', 'Wi-Fi cortesia'] }),

    e({ id: 'c017', nome: 'ODONTO FAMÍLIA CENTRO', razaoSocial: 'Odonto Família Clínica Odontológica Ltda',
      cnpj: '35.771.206/0001-11', cnae: '8630-5/04', segmento: 'Odontologia', abertura: '2019-04-08',
      cidade: 'Belo Horizonte', uf: 'MG', bairro: 'Savassi', endereco: 'Rua Pernambuco, 1080, Sala 502', cep: '30130-000',
      telefone: '(31) 3287-6650', whatsapp: '(31) 99506-6650', email: 'contato@odontofamilia-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: '@odontofamilia.bh', facebook: null,
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Prevenção e limpeza', 'Restaurações', 'Próteses', 'Ortodontia', 'Urgência odontológica'] }),

    e({ id: 'c018', nome: 'MECÂNICA DIESEL SUL', razaoSocial: 'Diesel Sul Reparação de Veículos Pesados Ltda',
      cnpj: '14.902.377/0001-59', cnae: '4520-0/01', segmento: 'Oficina Mecânica', abertura: '2011-06-15',
      cidade: 'Caxias do Sul', uf: 'RS', bairro: 'Distrito Industrial', endereco: 'Rua dos Metalúrgicos, 410', cep: '95040-000',
      telefone: '(54) 3221-8830', whatsapp: null, email: null,
      website: null, siteFraco: false, dominioProprio: false, instagram: null, facebook: 'dieselsul',
      googleBusiness: false, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Motores diesel', 'Sistema de freios', 'Bomba injetora', 'Manutenção preventiva de frotas'] }),

    e({ id: 'c019', nome: 'CANTINA NONNA ROSA', razaoSocial: 'Nonna Rosa Restaurante e Eventos Ltda',
      cnpj: '30.556.844/0001-73', cnae: '5611-2/01', segmento: 'Restaurante', abertura: '2017-09-21',
      cidade: 'São Paulo', uf: 'SP', bairro: 'Bela Vista', endereco: 'Rua Treze de Maio, 640', cep: '01327-000',
      telefone: '(11) 3288-9120', whatsapp: '(11) 98455-9120', email: 'reservas@nonnarosa-demo.com.br',
      website: 'nonnarosa-demo.com.br', siteFraco: true, dominioProprio: true, instagram: '@cantinanonnarosa', facebook: 'cantinanonnarosa',
      googleBusiness: true, situacao: 'ATIVA', porte: 'MEDIO',
      servicos: ['Massas artesanais', 'Rodízio italiano', 'Vinhos selecionados', 'Eventos privativos'] }),

    e({ id: 'c020', nome: 'CONTÁBIL PRECISÃO', razaoSocial: 'Precisão Serviços Contábeis Eireli',
      cnpj: '11.247.093/0001-85', cnae: '6920-6/01', segmento: 'Contabilidade', abertura: '2009-08-19',
      cidade: 'Curitiba', uf: 'PR', bairro: 'Batel', endereco: 'Av. do Batel, 1230, Cj. 302', cep: '80420-000',
      telefone: '(41) 3342-1170', whatsapp: '(41) 99878-1170', email: 'contato@precisaocontabil-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: null, facebook: null,
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Contabilidade empresarial', 'Departamento pessoal', 'Planejamento tributário', 'Regularização fiscal'] }),

    e({ id: 'c021', nome: 'TRANSPORTADORA ROTA NORTE', razaoSocial: 'Rota Norte Transportes Ltda',
      cnpj: '26.478.135/0001-02', cnae: '4930-2/02', segmento: 'Transportadora', abertura: '2015-02-11',
      cidade: 'Belém', uf: 'PA', bairro: 'Icoaraci', endereco: 'Rodovia Augusto Montenegro, Km 9', cep: '66820-000',
      telefone: '(91) 3245-6600', whatsapp: '(91) 98123-6600', email: 'operacional@rotanorte-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: '@rotanortetransportes', facebook: null,
      googleBusiness: true, situacao: 'ATIVA', porte: 'MEDIO',
      servicos: ['Transporte rodoviário', 'Distribuição urbana', 'Cargas refrigeradas', 'Rastreamento de frota'] }),

    e({ id: 'c022', nome: 'ESCOLA TÉCNICA PROGREDIR', razaoSocial: 'Progredir Capacitação Profissional Ltda',
      cnpj: '34.667.220/0001-16', cnae: '8599-6/04', segmento: 'Educação', abertura: '2018-08-27',
      cidade: 'Salvador', uf: 'BA', bairro: 'Pituba', endereco: 'Av. Manoel Dias da Silva, 1450', cep: '41830-000',
      telefone: '(71) 3345-2280', whatsapp: '(71) 99341-2280', email: 'matriculas@progredir-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: '@escolaprogredir', facebook: 'escolaprogredir',
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Cursos técnicos', 'Informática profissional', 'Administração', 'Cursos livres', 'Turmas in company'] }),

    e({ id: 'c023', nome: 'LIMPEZA TOTAL SERVIÇOS', razaoSocial: 'Limpeza Total Conservação e Serviços Ltda',
      cnpj: '20.998.451/0001-44', cnae: '8121-4/00', segmento: 'Serviços Gerais', abertura: '2014-10-14',
      cidade: 'Brasília', uf: 'DF', bairro: 'Taguatinga', endereco: 'QNA 34, Lote 12, Sala 4', cep: '72110-000',
      telefone: '(61) 3352-7790', whatsapp: '(61) 99230-7790', email: null,
      website: null, siteFraco: false, dominioProprio: false, instagram: null, facebook: 'limpezatotaldf',
      googleBusiness: false, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Limpeza predial', 'Conservação e portaria', 'Limpeza pós-obra', 'Jardinagem'] }),

    e({ id: 'c024', nome: 'IMÓVEIS BOA VISTA', razaoSocial: 'Boa Vista Intermediação Imobiliária Ltda',
      cnpj: '32.114.687/0001-90', cnae: '6821-8/01', segmento: 'Imobiliária', abertura: '2017-03-07',
      cidade: 'Florianópolis', uf: 'SC', bairro: 'Trindade', endereco: 'Rua Lauro Linhares, 890, Sala 11', cep: '88036-000',
      telefone: '(48) 3234-5510', whatsapp: '(48) 99617-5510', email: 'contato@imoveisboavista-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: '@imoveisboavista.floripa', facebook: null,
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Locação residencial', 'Venda de apartamentos', 'Imóveis para temporada', 'Administração predial'] }),

    e({ id: 'c025', nome: 'ACADEMIA FORÇA E FOCO', razaoSocial: 'Força e Foco Academia Ltda',
      cnpj: '37.885.012/0001-28', cnae: '9313-1/00', segmento: 'Academia', abertura: '2021-01-19',
      cidade: 'Manaus', uf: 'AM', bairro: 'Adrianópolis', endereco: 'Rua Rio Içá, 145', cep: '69057-000',
      telefone: '(92) 3236-4470', whatsapp: '(92) 99401-4470', email: null,
      website: null, siteFraco: false, dominioProprio: false, instagram: '@forcaefoco.manaus', facebook: null,
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Musculação', 'Crossfit', 'Jiu-jitsu', 'Aulas de dança', 'Nutrição esportiva'] }),

    e({ id: 'c026', nome: 'ADVOCACIA TRABALHISTA LIMA', razaoSocial: 'Lima Advogados Associados',
      cnpj: '15.442.778/0001-31', cnae: '6911-7/01', segmento: 'Advocacia', abertura: '2010-07-23',
      cidade: 'Porto Alegre', uf: 'RS', bairro: 'Moinhos de Vento', endereco: 'Rua Padre Chagas, 320, Cj. 705', cep: '90570-000',
      telefone: '(51) 3029-8840', whatsapp: null, email: 'contato@limaadv-demo.com.br',
      website: 'limaadv-demo.com.br', siteFraco: false, dominioProprio: true, instagram: '@limaadvogados', facebook: 'limaadvogados',
      googleBusiness: true, situacao: 'ATIVA', porte: 'MEDIO',
      servicos: ['Direito do trabalho', 'Defesa empresarial', 'Acordos e mediações', 'Compliance trabalhista'] }),

    e({ id: 'c027', nome: 'CASA DO PARAFUSO MATERIAIS', razaoSocial: 'Casa do Parafuso Comércio de Materiais Ltda',
      cnpj: '23.700.194/0001-67', cnae: '4781-4/00', segmento: 'Comércio Varejista', abertura: '2008-05-29',
      cidade: 'Anápolis', uf: 'GO', bairro: 'Jundiaí', endereco: 'Av. Brasil Norte, 2010', cep: '75110-000',
      telefone: '(62) 3324-1150', whatsapp: '(62) 99388-1150', email: null,
      website: null, siteFraco: false, dominioProprio: false, instagram: null, facebook: null,
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Ferragens', 'Materiais elétricos', 'Ferramentas', 'Fixadores industriais'] }),

    e({ id: 'c028', nome: 'CLÍNICA DERMA ESTÉTICA AVANÇADA', razaoSocial: 'Derma Avançada Serviços Estéticos Ltda',
      cnpj: '39.115.660/0001-07', cnae: '9602-5/02', segmento: 'Estética', abertura: '2022-03-15',
      cidade: 'Vitória', uf: 'ES', bairro: 'Praia do Canto', endereco: 'Rua Joaquim Lírio, 500, Sala 901', cep: '29055-000',
      telefone: '(27) 3325-9970', whatsapp: '(27) 99811-9970', email: 'contato@dermaavancada-demo.com.br',
      website: null, siteFraco: false, dominioProprio: false, instagram: '@dermaavancada.vix', facebook: null,
      googleBusiness: false, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Harmonização facial', 'Peeling químico', 'Microagulhamento', 'Tratamento capilar', 'Laser'] }),

    e({ id: 'c029', nome: 'OFICINA DO ZÉ FUNILARIA', razaoSocial: 'José Aparecido Funilaria e Pintura ME',
      cnpj: '13.008.552/0001-13', cnae: '4520-0/01', segmento: 'Oficina Mecânica', abertura: '2006-09-01',
      cidade: 'Rio Verde', uf: 'GO', bairro: 'Vila Maria', endereco: 'Rua 7, 145', cep: '75901-000',
      telefone: '(64) 3621-7730', whatsapp: '(64) 99155-7730', email: null,
      website: null, siteFraco: false, dominioProprio: false, instagram: null, facebook: null,
      googleBusiness: false, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Funilaria', 'Pintura automotiva', 'Polimento', 'Martelinho de ouro'] }),

    e({ id: 'c030', nome: 'PIZZARIA FORNO DE PEDRA', razaoSocial: 'Forno de Pedra Alimentação Ltda',
      cnpj: '40.229.806/0001-50', cnae: '5611-2/01', segmento: 'Restaurante', abertura: '2021-10-12',
      cidade: 'Natal', uf: 'RN', bairro: 'Ponta Negra', endereco: 'Av. Engenheiro Roberto Freire, 1800', cep: '59090-000',
      telefone: '(84) 3219-6640', whatsapp: '(84) 99622-6640', email: null,
      website: null, siteFraco: false, dominioProprio: false, instagram: '@fornodepedra.natal', facebook: 'fornodepedranatal',
      googleBusiness: true, situacao: 'ATIVA', porte: 'PEQUENO',
      servicos: ['Pizzas em forno a lenha', 'Massas', 'Delivery próprio', 'Espaço para eventos'] })
  ];

  /* Enriquecimento: CNAE descritivo, score e presença digital calculados */
  function cnaeDesc(cod) {
    for (var i = 0; i < CNAES.length; i++) if (CNAES[i].cod === cod) return CNAES[i].desc;
    return '—';
  }

  function preparar(c) {
    var s = global.Score.calcular(c);
    c.cnaeDesc = cnaeDesc(c.cnae);
    c.score = s.score;
    c.scoreFaixa = s.faixa;
    c.scoreClasse = s.classe;
    c.scoreDetalhes = s.detalhes;
    c.presenca = global.Score.presencaDigital(c);
    c.valorPotencial = global.Score.valorPotencial(c);
    c.origem = c.origem || 'Base de demonstração';
    return c;
  }

  EMPRESAS.forEach(preparar);

  global.Dados = {
    empresas: EMPRESAS,
    segmentos: SEGMENTOS,
    cnaes: CNAES,
    ufs: UFS,
    pacotes: PACOTES,
    estagios: ESTAGIOS,
    preparar: preparar,
    cnaeDesc: cnaeDesc,
    cidades: function () {
      var m = {};
      EMPRESAS.forEach(function (c) { m[c.cidade + '/' + c.uf] = { cidade: c.cidade, uf: c.uf }; });
      return Object.keys(m).sort().map(function (k) { return m[k]; });
    }
  };
})(window);
