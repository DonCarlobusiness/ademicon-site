import type { MetadataRoute } from "next";

/** Permite “Adicionar à tela inicial” no celular, abrindo em tela cheia como um aplicativo. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DON INVEST",
    short_name: "DON INVEST",
    description: "Simule e pesquise investimentos com dados oficiais, fonte e data.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#050a16",
    theme_color: "#050a16",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
