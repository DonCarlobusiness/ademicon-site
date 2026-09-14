import type { ptBR } from './pt-BR.js';

export const es419: Record<keyof typeof ptBR, string> = {
  welcome:
    'Hola! Soy SEIVA, su agronomo de bolsillo. Miro su lote por satelite, veo el clima y le ayudo con fertilizacion, plagas y costos.\n\nPuedo guardar sus datos (nombre, ubicacion del lote) para acompanarlo en la campana? Responda SI para continuar.',
  consentAccepted: 'De acuerdo. Sus datos son suyos: cuando quiera, escriba BORRAR MIS DATOS y elimino todo.',
  consentDenied:
    'Sin problema. Sin guardar los datos no puedo seguir su lote, pero puedo responder dudas sueltas. Solo pregunte.',
  askName: 'Como se llama?',
  askLocation:
    'Ahora mandeme la ubicacion del lote: toque el clip (+), elija Ubicacion y envie el pin desde dentro del area.',
  askCrop: 'Que esta sembrando en esa area? (soja, maiz, cafe, pastura...)',
  askArea: 'Cuantas hectareas tiene ese lote? Puede mandar solo el numero.',
  onboardingDone:
    'Listo, {name}! Lote de {area} ha de {crop} en {municipality} registrado.\n\nPuede mandarme:\n- foto de la hoja para ver plaga o enfermedad\n- audio con su duda\n- "como esta mi lote" para el mapa satelital\n- "va a llover?" para el clima de su area',

  onboardingDoneNoCity:
    'Listo, {name}! Lote de {area} ha de {crop} registrado.\n\nPuede mandarme:\n- foto de la hoja para ver plaga o enfermedad\n- audio con su duda\n- "como esta mi lote" para el mapa satelital\n- "va a llover?" para el clima de su area',
  noFieldYet: 'Todavia no tengo su lote registrado. Mandeme la ubicacion (pin) y lo registro al momento.',
  noClearPass:
    'No hubo pasada de satelite sin nubes en los ultimos {days} dias sobre su lote, asi que no tengo imagen confiable ahora. Cuando despeje le aviso.',
  rateLimited: 'Mando muchos mensajes en poco tiempo y necesito un respiro. Intente de nuevo en un rato.',
  genericError: 'Hubo un problema de mi lado. Intente de nuevo en unos minutos.',
  documentTooBig: 'Ese archivo es demasiado grande para abrirlo. Mandeme una foto de la pagina del analisis y la leo igual.',
  unsupportedMedia: 'No pude abrir ese archivo. Mandelo como foto, audio o texto y lo resuelvo.',
  audioTranscriptionFailed: 'No entendi el audio. Puede repetir hablando mas cerca del telefono?',

  pesticideWarning:
    'Aviso: la compra y aplicacion de agroquimicos exige receta agronomica emitida por un profesional habilitado. Yo oriento, quien prescribe es el agronomo.',
  dataDeleted: 'Borre todos sus datos. Si quiere volver, solo mande un mensaje.',

  ndviLegend:
    'Mapa de su lote del {date}.\nVerde fuerte = planta con buen vigor. Amarillo = vigor medio. Rojo = planta debil o falla.\nPromedio del lote: {mean}.',
  ndviDropAlert:
    'Atencion: el vigor de su lote de {crop} cayo {drop}% desde {since}. Conviene revisar el area {hint}.',

  frostAlert: 'Alerta de helada: minima prevista de {temp} C el {date} en su lote. Si tiene cultivo sensible, preparese.',
  heavyRainAlert: 'Alerta de lluvia fuerte: {mm} mm previstos para {date}. Evite aplicar y piense en la cosecha.',
  waterStressAlert: 'Su lote lleva {days} dias sin lluvia y el pronostico sigue seco. Si tiene riego, es hora de encenderlo.',
  sprayWindowGood: 'Buena ventana de aplicacion el {date}: viento y lluvia ayudan.',

  marketWindow: 'El precio del {crop} en su region esta en {price} ({date}). Si tiene lote para vender, vale conversar.',
};
