# Infinity Estética — conceito não oficial

Demo comercial especulativa por **Nítido Studio**. **Não é o site oficial** da Infinity Estética Avançada e **não foi aprovada** pela empresa. Nenhum botão abre o WhatsApp: todos os CTAs de contato abrem um diálogo de demonstração, e nada é enviado ou armazenado.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · `next/font` (Newsreader + Manrope). Não há dependências de runtime além de Next/React.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npx tsc --noEmit
npm run build && npm run start
```

## QA

As ferramentas de QA ficam em `qa/` e não fazem parte do site público. Elas usam o Playwright instalado globalmente:

```bash
NODE_PATH=$(npm root -g) node qa/interaction-test.cjs   # teclado, diálogo, Escape, foco, cópia, navegação, reduced motion
NODE_PATH=$(npm root -g) node qa/screenshot.cjs         # screenshots → qa/screenshots/
```

## Indexação

- `robots` meta: `noindex, nofollow, nocache`
- `/robots.txt`: `Disallow: /`
- cabeçalho `X-Robots-Tag: noindex, nofollow, noarchive` (em `next.config.ts`)

Os dados do negócio ficam restritos a `src/content/site.ts` e incluem apenas fatos públicos confirmados.
