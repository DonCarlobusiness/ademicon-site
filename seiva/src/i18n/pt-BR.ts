export const ptBR = {
  // --- Onboarding ---
  welcome:
    'Ola! Eu sou o SEIVA, seu agronomo de bolso. Eu olho seu talhao por satelite, vejo o clima e te ajudo com adubacao, praga e custo.\n\nPosso guardar seus dados (nome, local do talhao) para te acompanhar na safra? Responda SIM para continuar.',
  consentAccepted: 'Combinado. Seus dados sao seus: quando quiser, mande APAGAR MEUS DADOS e eu removo tudo.',
  consentDenied:
    'Sem problema. Sem guardar os dados eu nao consigo acompanhar seu talhao, mas posso tirar duvidas soltas. E so perguntar.',
  askName: 'Como voce se chama?',
  askLocation:
    'Agora me manda a localizacao do talhao: toque no clipe (+), escolha Localizacao e envie o pin de dentro da area.',
  askCrop: 'O que voce esta plantando nessa area? (soja, milho, cafe, pastagem...)',
  askArea: 'Quantos hectares tem esse talhao? Pode mandar so o numero.',
  onboardingDone:
    'Pronto, {name}! Talhao de {area} ha de {crop} em {municipality} cadastrado.\n\nPode me mandar:\n- foto da folha para eu ver praga ou doenca\n- audio com sua duvida\n- "como esta meu talhao" para o mapa de satelite\n- "vai chover?" para o clima da sua area',

  // --- Erros / limites ---
  noFieldYet: 'Ainda nao tenho seu talhao cadastrado. Me manda a localizacao (pin) que eu cadastro na hora.',
  noClearPass:
    'Nao teve passagem de satelite sem nuvem nos ultimos {days} dias no seu talhao, entao nao tenho imagem confiavel agora. Assim que limpar eu te aviso.',
  genericError: 'Deu um problema aqui do meu lado. Tenta de novo em alguns minutos.',
  unsupportedMedia: 'Nao consegui abrir esse arquivo. Manda como foto, audio ou texto que eu resolvo.',
  audioTranscriptionFailed: 'Nao entendi o audio. Pode repetir falando mais perto do telefone?',

  // --- Avisos legais ---
  pesticideWarning:
    'Aviso: para comprar e aplicar defensivo agricola e obrigatorio receituario agronomico emitido por profissional habilitado (Lei 7.802/89). Eu oriento, quem prescreve e o agronomo.',
  dataDeleted: 'Apaguei todos os seus dados. Se quiser voltar, e so mandar uma mensagem.',

  // --- Satelite ---
  ndviLegend:
    'Mapa do seu talhao em {date}.\nVerde forte = planta com vigor bom. Amarelo = vigor medio. Vermelho = planta fraca ou falha.\nMedia do talhao: {mean}.',
  ndviDropAlert:
    'Atencao: o vigor do seu talhao de {crop} caiu {drop}% desde {since}. Vale dar uma olhada na area {hint}.',

  // --- Clima ---
  frostAlert: 'Alerta de geada: minima prevista de {temp} C em {date} no seu talhao. Se tiver cultura sensivel, se prepare.',
  heavyRainAlert: 'Alerta de chuva forte: {mm} mm previstos para {date}. Evite aplicacao e pense na colheita.',
  waterStressAlert: 'Seu talhao esta {days} dias sem chuva e a previsao segue seca. Se tiver irrigacao, e hora de ligar.',
  sprayWindowGood: 'Boa janela de aplicacao em {date}: vento e chuva ajudam.',

  // --- Mercado ---
  marketWindow: 'O preco do {crop} na sua regiao esta em {price} ({date}). Se voce tem lote para vender, vale conversar.',
} as const;
