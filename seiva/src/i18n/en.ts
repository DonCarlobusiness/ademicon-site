import type { ptBR } from './pt-BR.js';

export const en: Record<keyof typeof ptBR, string> = {
  welcome:
    "Hi! I'm SEIVA, your pocket agronomist. I look at your field by satellite, check the weather and help you with fertiliser, pests and costs.\n\nMay I store your data (name, field location) to follow your season? Reply YES to continue.",
  consentAccepted: "Done. Your data is yours: whenever you want, send DELETE MY DATA and I'll remove everything.",
  consentDenied:
    "No problem. Without storing your data I can't follow your field, but I can still answer one-off questions. Just ask.",
  askName: "What's your name?",
  askLocation:
    'Now send me the field location: tap the clip (+), choose Location and send the pin from inside the area.',
  askCrop: 'What are you growing there? (soybean, maize, coffee, pasture...)',
  askArea: 'How many hectares is this field? Just the number is fine.',
  onboardingDone:
    'All set, {name}! Field of {area} ha of {crop} in {municipality} registered.\n\nYou can send me:\n- a photo of the leaf so I can check pest or disease\n- a voice note with your question\n- "how is my field" for the satellite map\n- "will it rain?" for your local weather',

  onboardingDoneNoCity:
    'All set, {name}! Field of {area} ha of {crop} registered.\n\nYou can send me:\n- a photo of the leaf so I can check pest or disease\n- a voice note with your question\n- "how is my field" for the satellite map\n- "will it rain?" for your local weather',
  noFieldYet: "I don't have your field registered yet. Send me the location (pin) and I'll register it right away.",
  noClearPass:
    "There was no cloud-free satellite pass over your field in the last {days} days, so I have no reliable image right now. I'll tell you as soon as it clears.",
  rateLimited: "That's a lot of messages in a short time and I need a breather. Try again in a little while.",
  genericError: 'Something broke on my side. Try again in a few minutes.',
  documentTooBig: "That file is too big for me to open. Send a photo of the report page and I'll read it just the same.",
  unsupportedMedia: "I couldn't open that file. Send it as a photo, voice note or text and I'll handle it.",
  audioTranscriptionFailed: "I didn't catch that audio. Could you repeat it closer to the phone?",

  pesticideWarning:
    'Notice: buying and applying crop protection products requires an agronomic prescription issued by a licensed professional. I advise; the agronomist prescribes.',
  dataDeleted: 'I deleted all your data. If you want to come back, just send a message.',

  ndviLegend:
    'Map of your field on {date}.\nStrong green = good plant vigour. Yellow = medium vigour. Red = weak plants or gaps.\nField average: {mean}.',
  ndviDropAlert:
    'Heads up: vigour in your {crop} field dropped {drop}% since {since}. Worth checking the {hint} area.',

  frostAlert: 'Frost alert: low of {temp} C forecast for {date} on your field. If you have a sensitive crop, get ready.',
  heavyRainAlert: 'Heavy rain alert: {mm} mm forecast for {date}. Avoid spraying and plan around harvest.',
  waterStressAlert: 'Your field has had {days} days without rain and the forecast stays dry. If you have irrigation, now is the time.',
  sprayWindowGood: 'Good spraying window on {date}: wind and rain are in your favour.',

  marketWindow: '{crop} is trading at {price} in your region ({date}). If you have a lot to sell, worth a chat.',
};
