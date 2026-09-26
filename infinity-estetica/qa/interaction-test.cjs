// Interaction QA. Usage: NODE_PATH=$(npm root -g) node qa/interaction-test.cjs [baseUrl]
const { chromium } = require("playwright");
const base = process.argv[2] || "http://localhost:3000";
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${extra}`); if (!ok) failed++; };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  let externalNav = false;
  page.on("request", (r) => { if (/wa\.me|whatsapp/i.test(r.url())) externalNav = true; });
  await page.goto(base, { waitUntil: "networkidle" });

  // Meta
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  check("robots meta noindex,nofollow", /noindex/.test(robots) && /nofollow/.test(robots), robots);
  const og = await page.locator('meta[property="og:image"]').count();
  check("og:image present", og > 0);
  check("html lang pt-BR", (await page.getAttribute("html", "lang")) === "pt-BR");
  check("single h1", (await page.locator("h1").count()) === 1);

  // Keyboard: skip link is first tab stop
  await page.keyboard.press("Tab");
  check("first Tab = skip link", (await page.evaluate(() => document.activeElement.textContent.trim())) === "Pular para o conteúdo");

  // Tab to hero CTA and open with Enter
  const cta = page.getByRole("button", { name: "Conversar pelo WhatsApp" }).first();
  await cta.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Uma prévia da conversa." });
  check("dialog opens from hero CTA (keyboard)", await dialog.isVisible());
  check("dialog is modal (aria)", await page.evaluate(() => document.querySelector("dialog").matches(":modal")));
  check("focus moved into dialog", await page.evaluate(() => document.querySelector("dialog").contains(document.activeElement)));
  check("no area line for generic CTA", (await dialog.getByText("Área de interesse").count()) === 0);
  // Focus stays in dialog after multiple tabs (only one control; page is inert)
  for (let i = 0; i < 3; i++) await page.keyboard.press("Tab");
  const inDialogOrChrome = await page.evaluate(() => { const a = document.activeElement; return a === document.body || document.querySelector("dialog").contains(a); });
  check("Tab does not reach page behind dialog", inDialogOrChrome);
  await page.keyboard.press("Escape");
  check("Escape closes dialog", !(await dialog.isVisible()));
  check("focus restored to hero CTA", await cta.evaluate((el) => el === document.activeElement));

  // Area row -> dialog mentions area; close via button restores focus
  const facial = page.getByRole("button", { name: "Conversar sobre estética corporal" });
  await facial.click();
  check("area dialog names area", await dialog.getByText("Estética corporal").isVisible());
  await dialog.getByRole("button", { name: "Voltar à página" }).click();
  check("close button closes dialog", !(await dialog.isVisible()));
  check("focus restored to area button", await facial.evaluate((el) => el === document.activeElement));

  // Final CTA
  const finalCta = page.getByRole("button", { name: "Conversar pelo WhatsApp" }).nth(1);
  await finalCta.click();
  check("final CTA opens dialog", await dialog.isVisible());
  await page.keyboard.press("Escape");
  check("no WhatsApp request made", !externalNav);
  check("URL unchanged", page.url().replace(/#.*/, "") === base.replace(/\/?$/, "/"));

  // Nav anchors
  for (const [label, id] of [["Áreas", "areas"], ["Endereço", "endereco"], ["Conversar", "conversa"]]) {
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: label }).click();
    await page.waitForTimeout(900);
    const { top, atEnd } = await page.evaluate((id) => ({
      top: document.getElementById(id).getBoundingClientRect().top,
      atEnd: Math.ceil(window.scrollY + innerHeight) >= document.documentElement.scrollHeight - 2,
    }), id);
    // The last section can't reach the top of the viewport; at page end it just has to be in view.
    check(`nav "${label}" scrolls to #${id}`, Math.abs(top) < 60 || (atEnd && top >= 0 && top < 900 / 2), `top=${Math.round(top)}`);
  }

  // Copy address
  await page.getByRole("button", { name: "Copiar endereço" }).click();
  const status = page.getByRole("status");
  await page.waitForTimeout(200);
  check("copy success message announced", (await status.textContent()).includes("Copiado"));
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check("clipboard contains address", clip.includes("Rua Primeiro de Maio, nº 1051") && clip.includes("47855-644"), JSON.stringify(clip));

  // Copy error path
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error("denied")); });
  await page.getByRole("button", { name: /endereço/ }).click();
  await page.waitForTimeout(200);
  check("copy error message announced", (await status.textContent()).includes("Não foi possível"));

  check("no console errors", errors.length === 0, JSON.stringify(errors));

  // Reduced motion: animated elements are not left hidden
  const rm = await browser.newPage({ reducedMotion: "reduce" });
  await rm.goto(base, { waitUntil: "networkidle" });
  const anim = await rm.evaluate(() => getComputedStyle(document.querySelector(".draw")).animationName);
  const h1op = await rm.evaluate(() => getComputedStyle(document.querySelector("h1")).opacity);
  check("reduced motion: no curve animation", anim === "none", anim);
  check("reduced motion: content visible", h1op === "1", h1op);
  const nm = await browser.newPage({ reducedMotion: "no-preference" });
  await nm.goto(base, { waitUntil: "networkidle" });
  await nm.waitForTimeout(1500);
  check("motion: curve animates", (await nm.evaluate(() => getComputedStyle(document.querySelector(".draw")).animationName)) === "draw");
  check("motion: content ends visible", (await nm.evaluate(() => getComputedStyle(document.querySelector("h1")).opacity)) === "1");

  // Touch targets on mobile
  const mob = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await mob.goto(base, { waitUntil: "networkidle" });
  const small = await mob.evaluate(() => [...document.querySelectorAll("a, button")].filter((e) => e.offsetParent && !e.classList.contains("sr-only")).map((e) => [e.textContent.trim().slice(0, 30), Math.round(e.getBoundingClientRect().height)]).filter(([, h]) => h < 48));
  check("mobile touch targets >= 48px", small.length === 0, JSON.stringify(small));

  await browser.close();
  console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
  process.exit(failed ? 1 : 0);
})();
