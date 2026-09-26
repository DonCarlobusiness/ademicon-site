/**
 * Confirmed public facts only. Nothing here should be invented:
 * no prices, hours, staff, credentials, results or testimonials.
 */
export const business = {
  name: "Infinity Estética Avançada",
  city: "Luís Eduardo Magalhães",
  state: "BA",
  address: {
    street: "Rua Primeiro de Maio",
    number: "1051",
    district: "Jardim Paraíso Fase I",
    cityLine: "Luís Eduardo Magalhães · BA",
    cep: "47855-644",
  },
} as const;

export const addressPlainText = [
  `${business.address.street}, nº ${business.address.number}`,
  business.address.district,
  "Luís Eduardo Magalhães - BA",
  `CEP ${business.address.cep}`,
].join("\n");

export const areas = [
  { id: "facial", label: "Estética facial" },
  { id: "corporal", label: "Estética corporal" },
  { id: "capilar", label: "Estética capilar" },
] as const;

export type AreaLabel = (typeof areas)[number]["label"];

export const studio = {
  conceptLine: "Conceito não oficial por Nítido Studio",
  footerLine: "Concept website by Nítido Studio",
} as const;
