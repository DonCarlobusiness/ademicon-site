/**
 * Smoke test da tela (Playwright) contra um servidor em execução.
 * Uso: npm run build && npm start  (em outro terminal)  →  BASE_URL=http://localhost:3000 npm run test:e2e
 * Requer Playwright (npm i -D playwright && npx playwright install chromium).
 * Saída: lista de verificações OK/FALHA; código de saída ≠ 0 se alguma falhar.
 */
import { createRequire } from "node:module";

// Usa o Playwright instalado no projeto ou globalmente (NODE_PATH). Local: npm i -D playwright && npx playwright install chromium
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR || null;
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "OK   " : "FALHA"} ${name}${detail ? " — " + detail : ""}`); };
const norm = (s) => s.replace(/\s/g, " ");

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(BASE + "/");
await p.evaluate(() => localStorage.clear());
await p.reload();

// 1. Campo de capital com R$ 750 editável
await p.waitForSelector("text=Quanto você quer investir?");
check("1. Home mostra 'Quanto você quer investir?' com R$ 750", (await p.inputValue("#capital")) === "750,00");
check("10. Perfil de risco não é imputado", (await p.inputValue("#risco")) === "sem_perfil" && (await p.inputValue("#perda")) === "");

const card = async (label) => norm(await p.locator(`p:text-is("${label}") + p`).first().innerText());

// 2. R$ 500 + 250/mês, 12 meses, 10% a.a.
await p.fill("#capital", "500");
await p.fill("#aporte", "250");
await p.click('button:text-is("1 ano")');
await p.fill("#taxa-intermediario", "10");
await p.selectOption("#cenario-foco", "2");
const fv12 = await card("Patrimônio final estimado (bruto)");
const inv12 = await card("Total investido");
check("2. R$ 500 + R$ 250/mês, 12m, 10% → R$ 3.685,13 e investido R$ 3.500,00", fv12.includes("3.685,13") && inv12.includes("3.500,00"), `${fv12} / ${inv12}`);
const rows = await p.locator("table.data tbody tr").count();
check("2. Tabela de horizontes e gráfico presentes", rows >= 9 && (await p.locator("svg[role=img]").count()) === 1, `${rows} linhas`);

// 3. R$ 10.000, 10 anos
await p.fill("#capital", "10.000");
await p.fill("#aporte", "0");
await p.click('button:text-is("10 anos")');
const fv10 = await card("Patrimônio final estimado (bruto)");
check("3. R$ 10.000 em 10 anos a 10% → R$ 25.937,42 (sem recarregar)", fv10.includes("25.937,42"), fv10);

// 4. Taxa 0%
await p.fill("#taxa-intermediario", "0");
const fv0 = await card("Patrimônio final estimado (bruto)");
const body = await p.locator("main").innerText();
check("4. Taxa 0% → FV = P + A·n, sem NaN", fv0.includes("10.000,00") && !/NaN/.test(body), fv0);
await p.fill("#taxa-intermediario", "10");

// 6. Sem regra tributária → "Impostos não calculados", sem líquido
check("6. Sem regra tributária mostra 'Impostos não calculados'", (await card("Impostos e custos")).includes("Impostos não calculados") && (await card("Patrimônio líquido estimado")) === "—");
await p.selectOption("#imposto", "renda_fixa_regressiva");
check("6b. Com regra tributária mostra líquido", (await card("Patrimônio líquido estimado")) !== "—");
await p.selectOption("#imposto", "nao_calcular");

// 11. Pesquisa real com R$ 750
await p.fill("#capital", "750");
await p.fill("#aporte", "250");
await p.click('button:text-is("1 ano")');
await p.click('button:text-is("Pesquisar oportunidades agora")');
await p.waitForSelector("#resultado-pesquisa", { timeout: 90000 });
const res = norm(await p.locator("#resultado-pesquisa").innerText());
const srcLinks = await p.locator('#resultado-pesquisa a:text-is("fonte")').count();
check("11. Pesquisa exibe fonte oficial com horário e link", srcLinks > 0 && /Atualizado em \d{2}\/\d{2}\/\d{4}/.test(res), `${srcLinks} links de fonte`);
check("11b. Indica conectores (ok/falhos)", /fontes ok:/.test(res));
check("8. Sem provedor de cotações → cobertura indisponível (sem cotação fictícia)", res.includes("configure QUOTES_PROVIDER/QUOTES_API_KEY"));
check("7. Nenhum produto acima do valor aparece como opção ranqueada", !res.includes("acima do seu valor"));
if (SHOTS) await p.screenshot({ path: `${SHOTS}/e2e-resultado.png`, fullPage: false });

// 9. Mobile 360px
const m = await b.newPage({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(BASE + "/");
const sw = await m.evaluate(() => document.documentElement.scrollWidth);
const im = await m.getAttribute("#capital", "inputmode");
const fs = await m.$eval("#capital", (el) => parseFloat(getComputedStyle(el).fontSize));
check("9. Mobile 360px sem rolagem lateral, teclado numérico e fonte legível", sw <= 360 && im === "decimal" && fs >= 16, `scrollWidth=${sw}, inputmode=${im}, fonte=${fs}px`);
if (SHOTS) await m.screenshot({ path: `${SHOTS}/e2e-mobile.png` });
check("12. Celular: barra de navegação inferior visível e menu do topo oculto", (await m.locator("nav[aria-label=Principal].fixed").isVisible()) && !(await m.locator("header nav").isVisible()));
await m.fill("#aporte", "250");
await m.click('button:text-is("Pesquisar oportunidades agora")');
await m.waitForSelector("#resultado-pesquisa h3", { timeout: 90000 });
const cards = await m.locator("#resultado-pesquisa ul.md\\:hidden > li").count();
const tableVisible = await m.locator("#resultado-pesquisa table").first().isVisible();
const swRes = await m.evaluate(() => document.documentElement.scrollWidth);
check("13. Celular: resultado em cartões, sem tabela larga e sem rolagem lateral", cards > 0 && !tableVisible && swRes <= 360, `${cards} cartões, scrollWidth=${swRes}`);
check("14. Desktop: menu completo no topo, sem barra inferior", (await p.locator("header nav").isVisible()) && !(await p.locator("nav[aria-label=Principal].fixed").isVisible()));
check("15. Desktop: resultado em tabela", await p.locator("#resultado-pesquisa table").first().isVisible());

const PAGES = ["/", "/simulador", "/pesquisar", "/dashboard", "/ativos", "/instituicoes", "/configuracoes", "/mentor", "/carteira", "/academy"];
for (const [w, page] of [[360, m], [1440, p]]) {
  const over = [];
  for (const path of PAGES) {
    await page.goto(BASE + path);
    const sw2 = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw2 > w) over.push(`${path}=${sw2}`);
  }
  check(`16. ${w}px: nenhuma página com rolagem lateral`, over.length === 0, over.join(", "));
}

check("Sem erros de JavaScript na página", errors.length === 0, errors.join(" | "));
await b.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} verificações OK`);
process.exit(failed ? 1 : 0);
