/* debug pontual de uma ferramenta que falhou */
"use strict";
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const TMP = path.join(__dirname, "tmp");

(async () => {
  const tela = process.argv[2] || "jpg-para-pdf.html";
  const args = process.argv.slice(3);
  const semClique = args.includes("no-acao");
  const arquivos = (args.length ? args : ["foto1.png", "foto2.jpg"]).filter(f => f !== "no-acao");
  const edge = ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"].find(fs.existsSync);
  const browser = await chromium.launch({ executablePath: edge, headless: true });
  const page = await (await browser.newContext({ acceptDownloads: true })).newPage();
  page.on("console", m => console.log("CONSOLE:", m.type(), m.text().slice(0, 300)));
  page.on("pageerror", e => console.log("PAGEERROR:", String(e).slice(0, 500)));
  await page.goto(`file:///${path.join(ROOT, tela).replace(/\\/g, "/")}`, { waitUntil: "load" });
  await page.setInputFiles("#inputArq", arquivos.map(f => path.join(TMP, f)));
  if (!semClique) { await page.click("#btnAcao"); }
  await page.waitForTimeout(15000);
  const info = await page.evaluate(() => ({
    painelExiste: !!document.getElementById("painelPaginas"),
    painelHidden: (document.getElementById("painelPaginas") || {}).hidden,
    zonaHidden: (document.getElementById("zona") || {}).hidden,
    thumbsExiste: !!document.getElementById("thumbs"),
    thumbsHtmlLen: ((document.getElementById("thumbs") || {}).innerHTML || "").length,
    thumbsFilhos: document.getElementById("thumbs") ? document.getElementById("thumbs").children.length : -1,
    contador: (document.getElementById("contador") || {}).textContent,
    statusHidden: (document.getElementById("status") || {}).hidden
  }));
  console.log("DOM:", JSON.stringify(info));
  const status = await page.locator("#status").textContent().catch(() => "(sem status)");
  const temResultado = await page.locator(".resultado-card a").count();
  console.log("STATUS:", status);
  console.log("RESULTADO CARDS:", temResultado);
  const organizadorThumbs = await page.locator(".thumb-frame canvas").count();
  console.log("THUMBS CANVAS:", organizadorThumbs);
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });
