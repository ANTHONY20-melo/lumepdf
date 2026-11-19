/* LUMEPDF — smoke test do EXE empacotado via CDP
   Abre win-unpacked\LumePDF.exe com porta de debug, conecta pelo CDP,
   navega entre páginas e verifica erros de página/console. */

"use strict";
const { chromium } = require("playwright-core");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const EXE = path.join(__dirname, "..", "dist", "win-unpacked", "LumePDF.exe");
const PORTA = 9333;

function esperarCdp(tentativa) {
  return new Promise((resolve, reject) => {
    const pedir = () => {
      http.get(`http://127.0.0.1:${PORTA}/json/version`, res => {
        res.resume();
        resolve(true);
      }).on("error", () => setTimeout(pedir, 500));
    };
    const t = setTimeout(() => reject(new Error("CDP não subiu")), (tentativa || 20000));
    setTimeout(pedir, 500);
    void t;
  });
}

(async () => {
  const proc = spawn(EXE, [`--remote-debugging-port=${PORTA}`], { detached: false });
  let erros = [];
  try {
    await esperarCdp();
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORTA}`);
    const ctx = browser.contexts()[0];
    const page = ctx.pages()[0];
    page.on("pageerror", e => erros.push("pageerror: " + e));

    console.log("TITULO ATUAL:", await page.title());
    await page.reload({ waitUntil: "load" });

    /* confere a home: grid de ferramentas */
    await page.waitForSelector(".card-ferramenta", { timeout: 30000 });
    const cards = await page.locator(".card-ferramenta").count();
    console.log("CARDS NA HOME:", cards);

    /* carrega as 17 páginas e conta erros de carregamento */
    const rotas = ["juntar", "dividir", "comprimir", "rodar", "jpg-para-pdf", "numerar",
      "organizar", "marca-dagua", "reparar", "pdf-para-word", "word-para-pdf",
      "pdf-para-excel", "excel-para-pdf", "pdf-para-powerpoint", "powerpoint-para-pdf",
      "pdf-para-jpg"];
    let paginasOk = 0;
    for (const r of rotas) {
      await page.goto(`file:///C:/Users/ANTHONY/Desktop/PROJETOS/sexta-feira/lumepdf/${r}.html`, { waitUntil: "load" });
      const app = await page.locator("#app").count();
      if (app) paginasOk++; else erros.push(`${r}: #app ausente`);
    }
    console.log("PAGINAS COM APP:", paginasOk, "/", rotas.length);

    if (erros.length) {
      console.log("ERROS:", erros.join(" | "));
      process.exitCode = 1;
    } else {
      console.log("EXE EMPACOTADO: TUDO BEM");
    }
  } finally {
    try { process.kill(-proc.pid); } catch (_) { /* já fechou */ }
    try { proc.kill(); } catch (_) { /* já fechou */ }
    const { execSync } = require("child_process");
    try { execSync("taskkill /IM LumePDF.exe /F", { stdio: "ignore" }); } catch (_) { /* nada */ }
  }
})().catch(e => {
  console.error("SMOKE FALHOU:", e);
  try { require("child_process").execSync("taskkill /IM LumePDF.exe /F", { stdio: "ignore" }); } catch (_) { /* nada */ }
  process.exit(1);
});
