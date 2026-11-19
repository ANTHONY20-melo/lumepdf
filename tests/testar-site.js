/* LUMEPDF — teste E2E de TODAS as ferramentas (Edge headless via playwright-core)
   Gera fixtures reais (PDF/DOCX/XLSX/PPTX/PNG/JPG), abre cada página,
   injeta os arquivos, clica em Processar, baixa o resultado e valida o conteúdo. */

"use strict";
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TMP = path.join(__dirname, "tmp");
const OUT = path.join(__dirname, "downloads");
const PDF_LIB = require("pdf-lib");
const JSZip = require("jszip");
const XLSX = require("xlsx");

let ok = 0, falhas = 0, casos = [];

function log(tag, msg) { console.log(`[${tag}] ${msg}`); }

/* ---------- fixtures ---------- */
async function gerarFixtures() {
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });

  const { PDFDocument, rgb, StandardFonts } = PDF_LIB;
  async function pdfPaginas(nome, n, texto) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 1; i <= n; i++) {
      const p = doc.addPage([595, 842]);
      p.drawText(texto + " " + i, { x: 60, y: 700, size: 24, font, color: rgb(0.1, 0.1, 0.1) });
      p.drawText("LumePDF teste E2E", { x: 60, y: 650, size: 12, font });
    }
    fs.writeFileSync(path.join(TMP, nome), await doc.save());
  }
  await pdfPaginas("t1.pdf", 3, "Documento um");
  await pdfPaginas("t2.pdf", 2, "Documento dois");

  /* PNG/JPG são gerados pelo próprio navegador de teste (canvas) — ver main() */

  /* docx mínimo válido */
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Linha um do teste</w:t></w:r></w:p><w:p><w:r><w:t>Linha dois com entidades</w:t></w:r></w:p></w:body></w:document>');
  fs.writeFileSync(path.join(TMP, "teste.docx"), await zip.generateAsync({ type: "nodebuffer" }));

  /* xlsx */
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Produto", "Valor"], ["Teclado", 120], ["Mouse", 45]]), "Lista");
  fs.writeFileSync(path.join(TMP, "planilha.xlsx"), XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

  /* pptx */
  const PptxGenJS = require("pptxgenjs");
  const pptx = new PptxGenJS();
  const s1 = pptx.addSlide();
  s1.addText("Titulo do slide um", { x: 1, y: 1, fontSize: 24 });
  s1.addText("Corpo do slide um", { x: 1, y: 2, fontSize: 14 });
  const s2 = pptx.addSlide();
  s2.addText("Segundo slide aqui", { x: 1, y: 1, fontSize: 20 });
  await pptx.writeFile({ fileName: path.join(TMP, "apresentacao.pptx") });

  log("fixtures", "gerados em " + TMP);
}

/* ---------- execução por página ---------- */
async function testarFerramenta(pagina, tela, arquivos, opts) {
  opts = opts || {};
  const url = `file:///${path.join(ROOT, tela).replace(/\\/g, "/")}`;
  const erros = [];
  const capturar = (e) => erros.push(String(e));
  pagina.on("pageerror", capturar);

  await pagina.goto(url, { waitUntil: "load", timeout: 60000 });
  await pagina.setInputFiles("#inputArq", arquivos.map(f => path.join(TMP, f)));

  if (opts.antes) await opts.antes(pagina);
  await pagina.click(opts.botao || "#btnAcao", { timeout: 5000 });

  await pagina.waitForSelector(".resultado-card a", { timeout: 90000 });
  const totalSaidas = await pagina.locator(".resultado-card a").count();
  const limite = opts.baixar || 1;
  const saidas = [];
  for (let i = 0; i < Math.min(limite, totalSaidas); i++) {
    const nome = await pagina.locator(".resultado-card a").nth(i).getAttribute("download");
    const esperado = pagina.waitForEvent("download");
    await pagina.locator(".resultado-card a").nth(i).click();
    const download = await esperado;
    const caminho = path.join(OUT, `${Date.now()}-${nome}`);
    await download.saveAs(caminho);
    saidas.push({ caminho, nome });
  }
  pagina.off("pageerror", capturar);
  return { saidas, totalSaidas, erros };
}

function validarArquivo(c) {
  const bytes = fs.readFileSync(c.caminho);
  const nome = c.nome.toLowerCase();
  if (nome.endsWith(".pdf")) {
    if (bytes.slice(0, 5).toString("latin1") !== "%PDF-") throw new Error("PDF invalido (cabecalho)");
  } else if ([".docx", ".xlsx", ".pptx"].some(e => nome.endsWith(e))) {
    if (bytes.length < 250 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("OOXML invalido (PK)");
  } else if (nome.endsWith(".jpg") || nome.endsWith(".jpeg")) {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("JPG invalido (FFD8)");
  } else if (nome.endsWith(".png")) {
    if (bytes[0] !== 0x89) throw new Error("PNG invalido");
  }
  if (bytes.length < 100) throw new Error("arquivo suspeito <100 bytes");
  return bytes.length;
}

(async () => {
  await gerarFixtures();

  const caminhoEdge = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
  ].find(p => fs.existsSync(p));
  if (!caminhoEdge) throw new Error("Edge nao encontrado");
  log("runner", "Edge: " + caminhoEdge);

  const browser = await chromium.launch({ executablePath: caminhoEdge, headless: true });
  const contexto = await browser.newContext({ acceptDownloads: true, viewport: { width: 1300, height: 900 } });
  const pagina = await contexto.newPage();
  pagina.setDefaultTimeout(90000);

  /* imagens de teste 64x64 geradas pelo próprio navegador (sempre válidas) */
  await pagina.goto("about:blank");
  const dataUriPng = await pagina.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#2563eb"; g.fillRect(0, 0, 64, 64);
    g.fillStyle = "#fff"; g.fillRect(24, 8, 8, 32); g.fillRect(38, 8, 8, 32);
    return c.toDataURL("image/png");
  });
  const dataUriJpg = await pagina.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#0b2544"; g.fillRect(0, 0, 64, 64);
    g.fillStyle = "#fff"; g.beginPath(); g.arc(32, 32, 16, 0, 6.3); g.fill();
    return c.toDataURL("image/jpeg", 0.9);
  });
  fs.writeFileSync(path.join(TMP, "foto1.png"), Buffer.from(dataUriPng.split(",")[1], "base64"));
  fs.writeFileSync(path.join(TMP, "foto2.jpg"), Buffer.from(dataUriJpg.split(",")[1], "base64"));
  log("fixtures", "imagens 64x64 geradas via canvas");

  async function run(cod, tela, arquivos, opts, validar) {
    const t0 = Date.now();
    try {
      const resultado = await testarFerramenta(pagina, tela, arquivos, opts);
      if (resultado.erros.length) throw new Error("pageerror: " + resultado.erros[0]);
      for (const s of resultado.saidas) validarArquivo(s);
      if (validar) await validar(resultado);
      ok++;
      const lista = resultado.saidas.map(s => s.nome).join(", ");
      casos.push({ cod, estado: "PASS", info: `[${lista}] (${resultado.totalSaidas} saida(s), ${Date.now() - t0}ms)` });
      log("OK", `${cod} ${casos[casos.length - 1].info}`);
    } catch (erro) {
      falhas++;
      casos.push({ cod, estado: "FAIL", info: String(erro).split("\n")[0] });
      log("FALHA", `${cod}: ${String(erro).split("\n")[0]}`);
    }
  }

  await run("juntar", "juntar.html", ["t1.pdf", "t2.pdf"], null, async (r) => {
    const doc = await PDF_LIB.PDFDocument.load(fs.readFileSync(r.saidas[0].caminho));
    if (doc.getPageCount() !== 5) throw new Error("junta tinha q ter 5 paginas, tem " + doc.getPageCount());
  });
  await run("dividir-intervalo", "dividir.html", ["t1.pdf"], {
    antes: async (p) => { await p.fill("#opt-intervalo", "1-2"); }
  });
  await run("dividir-cada", "dividir.html", ["t1.pdf"], {
    antes: async (p) => { await p.check('input[name="opt-modo"][value="cada"]'); },
    baixar: 3
  }, async (r) => { if (r.totalSaidas !== 3) throw new Error("esperava 3 saidas, veio " + r.totalSaidas); });
  await run("comprimir", "comprimir.html", ["t1.pdf"]);
  await run("reparar", "reparar.html", ["t1.pdf"]);
  await run("rodar", "rodar.html", ["t1.pdf"]);
  await run("jpg-para-pdf", "jpg-para-pdf.html", ["foto1.png", "foto2.jpg"]);
  await run("numerar", "numerar.html", ["t1.pdf"]);
  await run("marca-dagua", "marca-dagua.html", ["t1.pdf"], {
    antes: async (p) => { await p.fill("#opt-texto", "Uso interno"); }
  });
  await run("pdf-para-word", "pdf-para-word.html", ["t1.pdf", "t2.pdf"]);
  await run("word-para-pdf", "word-para-pdf.html", ["teste.docx"]);
  await run("pdf-para-excel", "pdf-para-excel.html", ["t1.pdf"]);
  await run("excel-para-pdf", "excel-para-pdf.html", ["planilha.xlsx"]);
  await run("pdf-para-powerpoint", "pdf-para-powerpoint.html", ["t1.pdf"]);
  await run("powerpoint-para-pdf", "powerpoint-para-pdf.html", ["apresentacao.pptx"]);
  await run("pdf-para-jpg", "pdf-para-jpg.html", ["t1.pdf"], { baixar: 3 },
    async (r) => { if (r.totalSaidas !== 3) throw new Error("esperava 3 JPGs, veio " + r.totalSaidas); });
  await run("organizar", "organizar.html", ["t1.pdf"], {
    antes: async (p) => {
      await p.waitForSelector(".thumb-frame canvas", { timeout: 60000 });
      await p.locator('[data-mover="0"][data-dir="1"]').click();
      await p.waitForTimeout(400);
      await p.click("#btnAplicar");
    },
    botao: "#btnAplicar"
  });

  await browser.close();

  console.log("\n================= RELATORIO =================");
  casos.forEach(c => console.log(`${c.estado}  ${c.cod}  ${c.info}`));
  console.log(`\n${ok} OK / ${falhas} FALHA / ${casos.length} total`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
