// QA screenshots — not part of the public site.
// Usage: NODE_PATH=$(npm root -g) node qa/screenshot.cjs [baseUrl] [outDir]
const { chromium } = require("playwright");
const path = require("path");

const base = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || path.join(__dirname, "screenshots");
const viewports = [
  [375, 812], [430, 932], [768, 1024], [1024, 768], [1440, 900],
];

(async () => {
  const browser = await chromium.launch();
  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: `${out}/${width}x${height}-fold.png` });
    await page.screenshot({ path: `${out}/${width}x${height}-full.png`, fullPage: true });
    await page.getByRole("button", { name: "Conversar sobre estética facial" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${width}x${height}-dialog.png` });
    console.log(`${width}x${height} overflowX=${overflow} errors=${JSON.stringify(errors)}`);
    await page.close();
  }
  await browser.close();
})();
