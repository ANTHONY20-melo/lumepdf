/* LUMEPDF — ferramenta.js
   Motor genérico das páginas de ferramenta + lógica das 6 ferramentas.
   Todas rodam 100% no navegador com pdf-lib (nenhum upload a servidores). */

(function () {
  "use strict";

  if (!window.LUME_FERRAMENTA_ID) return;
  var ID = window.LUME_FERRAMENTA_ID;

  /* ---------------- utilidades ---------------- */
  function fmtTam(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  }

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var MARGEM_TEXTO = 24;
  var POSICAO = {
    "topo-esq":   function (w, h) { return { x: MARGEM_TEXTO, y: h - MARGEM_TEXTO }; },
    "topo-centro": function (w, h) { return { x: w / 2, y: h - MARGEM_TEXTO }; },
    "topo-dir":   function (w, h) { return { x: w - MARGEM_TEXTO, y: h - MARGEM_TEXTO }; },
    "baixo-esq":  function (w, h) { return { x: MARGEM_TEXTO, y: MARGEM_TEXTO / 2 }; },
    "baixo-centro": function (w, h) { return { x: w / 2, y: MARGEM_TEXTO / 2 }; },
    "baixo-dir":  function (w, h) { return { x: w - MARGEM_TEXTO, y: MARGEM_TEXTO / 2 }; }
  };

  function baixar(blob, nome) {
    // Adiciona timestamp para evitar sobrescrever arquivo anterior no Downloads
    var ext = nome.slice(nome.lastIndexOf("."));
    var base = nome.slice(0, nome.lastIndexOf("."));
    var timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19); // 2026-11-18T14-30-00
    var nomeComTimestamp = base + "-" + timestamp + ext;
    return {
      nome: nomeComTimestamp,
      tamanho: fmtTam(blob.size),
      url: URL.createObjectURL(blob)
    };
  }

  /* ---------------- registro de ferramentas ---------------- */
  var TOOLS = {

    juntar: {
      titulo: "Juntar PDF",
      accept: ".pdf,application/pdf",
      multi: true,
      reordenar: true,
      textoZona: "Selecione os arquivos PDF",
      descricaoOpcoes: "Arraste os PDFs; a ordem da lista é a ordem do documento final.",
      opcoes: null,
      processar: async function (arquivos) {
        var saida = await PDFLib.PDFDocument.create();
        for (var i = 0; i < arquivos.length; i++) {
          var doc = await PDFLib.PDFDocument.load(await arquivos[i].arrayBuffer(), { ignoreEncryption: false });
          var paginas = await saida.copyPages(doc, doc.getPageIndices());
          paginas.forEach(function (p) { saida.addPage(p); });
        }
        var bytes = await saida.save({ useObjectStreams: true });
        return [baixar(new Blob([bytes], { type: "application/pdf" }), "lumpdf-juntado.pdf")];
      }
    },

    dividir: {
      titulo: "Dividir PDF",
      accept: ".pdf,application/pdf",
      multi: true,
      reordenar: false,
      textoZona: "Selecione o arquivo PDF",
      opcoes: {
        modo: {
          tipo: "radio", nome: "Modo de divisão",
          valores: [
            { v: "intervalo", t: "Intervalo de páginas" },
            { v: "cada", t: "Cada página em arquivo separado" }
          ],
          padrao: "intervalo"
        },
        intervalo: {
          tipo: "text", nome: "Intervalo",
          padrao: "1-3", ajuda: "Ex.: <b>1-3,5,8-10</b> — usado apenas no modo intervalo"
        }
      },
      _parseIntervalo: function (txt, total) {
        var partes = [];
        txt.split(",").forEach(function (pedaco) {
          pedaco = pedaco.trim();
          if (!pedaco) return;
          var m = pedaco.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
          if (!m) throw new Error('Intervalo inválido: "' + pedaco + '". Use algo como 1-3,5.');
          var ini = parseInt(m[1], 10), fim = m[2] ? parseInt(m[2], 10) : ini;
          if (ini < 1 || fim > total || ini > fim)
            throw new Error('Páginas fora do documento (o PDF tem ' + total + ' páginas): "' + pedaco + '".');
          partes.push([ini - 1, fim - 1]);
        });
        if (!partes.length) throw new Error("Informe ao menos um intervalo, ex.: 1-3");
        return partes;
      },
      processar: async function (arquivos, opts) {
        var saidas = [];
        for (var i = 0; i < arquivos.length; i++) {
          var doc = await PDFLib.PDFDocument.load(await arquivos[i].arrayBuffer());
          var total = doc.getPageCount();
          var base = arquivos[i].name.replace(/\.pdf$/i, "");
          if (opts.modo === "intervalo") {
            var faixas = this._parseIntervalo(opts.intervalo, total);
            for (var f = 0; f < faixas.length; f++) {
              var novo = await PDFLib.PDFDocument.create();
              var idx = [];
              for (var pg = faixas[f][0]; pg <= faixas[f][1]; pg++) idx.push(pg);
              var pags = await novo.copyPages(doc, idx);
              pags.forEach(function (p) { novo.addPage(p); });
              var bytes = await novo.save({ useObjectStreams: true });
              saidas.push(baixar(new Blob([bytes], { type: "application/pdf" }),
                base + "-pag" + (faixas[f][0] + 1) + "-" + (faixas[f][1] + 1) + ".pdf"));
            }
          } else {
            for (var pg2 = 0; pg2 < total; pg2++) {
              var novo2 = await PDFLib.PDFDocument.create();
              var p2 = await novo2.copyPages(doc, [pg2]);
              novo2.addPage(p2[0]);
              var b2 = await novo2.save({ useObjectStreams: true });
              saidas.push(baixar(new Blob([b2], { type: "application/pdf" }), base + "-pag" + (pg2 + 1) + ".pdf"));
            }
          }
        }
        return saidas;
      }
    },

    comprimir: {
      titulo: "Comprimir PDF",
      accept: ".pdf,application/pdf",
      multi: true,
      reordenar: false,
      textoZona: "Selecione o arquivo PDF",
      opcoes: {
        nivel: {
          tipo: "select", nome: "Nível de otimização",
          valores: [
            { v: "leve", t: "Leve — máxima qualidade" },
            { v: "forte", t: "Forte — menor tamanho" }
          ],
          padrao: "leve"
        }
      },
      processar: async function (arquivos, opts) {
        var saidas = [];
        for (var i = 0; i < arquivos.length; i++) {
          var doc = await PDFLib.PDFDocument.load(await arquivos[i].arrayBuffer());
          doc.setProducer("LumePDF");
          doc.setCreator("LumePDF");
          /* reorganiza referências internas em streams de objeto comprimidos */
          var bytes = await doc.save({ useObjectStreams: true });
          if (opts.nivel === "forte" && doc.getPageCount() > 0) {
            doc.setTitle("");
            doc.setSubject("");
            doc.setKeywords([]);
            bytes = await doc.save({ useObjectStreams: true });
          }
          var antes = arquivos[i].size, depois = bytes.length;
          var nó = baixar(new Blob([bytes], { type: "application/pdf" }),
            arquivos[i].name.replace(/\.pdf$/i, "") + "-comprimido.pdf");
          nó.desc = antes > depois
            ? "Reduzido: " + fmtTam(antes) + " \u2192 " + fmtTam(depois) + " (" + Math.round((1 - depois / antes) * 100) + "% menor)"
            : "Este arquivo já estava otimizado — tamanho mantido (" + fmtTam(antes) + ")";
          saidas.push(nó);
        }
        return saidas;
      }
    },

    rodar: {
      titulo: "Rodar PDF",
      accept: ".pdf,application/pdf",
      multi: true,
      reordenar: false,
      textoZona: "Selecione o arquivo PDF",
      opcoes: {
        angulo: {
          tipo: "select", nome: "Girar",
          valores: [
            { v: "90", t: "90\u00B0 \u00E0 direita" },
            { v: "180", t: "180\u00B0" },
            { v: "270", t: "90\u00B0 \u00E0 esquerda" }
          ],
          padrao: "90"
        }
      },
      processar: async function (arquivos, opts) {
        var delta = parseInt(opts.angulo, 10);
        var saidas = [];
        for (var i = 0; i < arquivos.length; i++) {
          var doc = await PDFLib.PDFDocument.load(await arquivos[i].arrayBuffer());
          doc.getPages().forEach(function (p) {
            var atual = p.getRotation().angle || 0;
            p.setRotation(PDFLib.degrees((atual + delta) % 360));
          });
          var bytes = await doc.save({ useObjectStreams: true });
          saidas.push(baixar(new Blob([bytes], { type: "application/pdf" }),
            arquivos[i].name.replace(/\.pdf$/i, "") + "-girado.pdf"));
        }
        return saidas;
      }
    },

    "jpg-para-pdf": {
      titulo: "JPG para PDF",
      accept: ".jpg,.jpeg,.png,image/jpeg,image/png",
      multi: true,
      reordenar: true,
      textoZona: "Selecione imagens JPG ou PNG",
      opcoes: {
        tamanho: {
          tipo: "select", nome: "Tamanho da página",
          valores: [
            { v: "a4", t: "A4 (com imagem ajustada)" },
            { v: "ajustada", t: "Do tamanho de cada imagem" }
          ],
          padrao: "a4"
        },
        margem: {
          tipo: "select", nome: "Margem",
          valores: [
            { v: "0", t: "Nenhuma" }, { v: "18", t: "Pequena" },
            { v: "40", t: "Média" }, { v: "72", t: "Grande" }
          ],
          padrao: "18"
        }
      },
      processar: async function (arquivos, opts) {
        var doc = await PDFLib.PDFDocument.create();
        var A4W = 595.28, A4H = 841.89, mg = parseFloat(opts.margem);
        for (var i = 0; i < arquivos.length; i++) {
          var bytes = await arquivos[i].arrayBuffer();
          var ext = (arquivos[i].name.split(".").pop() || "").toLowerCase();
          var img = ext === "png"
            ? await doc.embedPng(bytes)
            : await doc.embedJpg(bytes);
          var isA4 = opts.tamanho === "a4";
          var w = isA4 ? A4W : img.width;
          var h = isA4 ? A4H : img.height;
          var pagina = doc.addPage([w, h]);
          var mq = isA4 ? mg : 0;
          var escala = Math.min((w - mq * 2) / img.width, (h - mq * 2) / img.height);
          var fw = img.width * escala, fh = img.height * escala;
          pagina.drawImage(img, {
            x: (w - fw) / 2, y: (h - fh) / 2,
            width: fw, height: fh
          });
        }
        var out = await doc.save({ useObjectStreams: true });
        return [baixar(new Blob([out], { type: "application/pdf" }), "lumpdf-imagens.pdf")];
      }
    },

    numerar: {
      titulo: "Números de página",
      accept: ".pdf,application/pdf",
      multi: false,
      reordenar: false,
      textoZona: "Selecione o arquivo PDF",
      opcoes: {
        posicao: {
          tipo: "select", nome: "Posição",
          valores: [
            { v: "baixo-centro", t: "Rodap\u00E9 ao centro" },
            { v: "baixo-dir", t: "Rodap\u00E9 \u00E0 direita" },
            { v: "baixo-esq", t: "Rodap\u00E9 \u00E0 esquerda" },
            { v: "topo-centro", t: "Topo ao centro" },
            { v: "topo-dir", t: "Topo \u00E0 direita" },
            { v: "topo-esq", t: "Topo \u00E0 esquerda" }
          ],
          padrao: "baixo-centro"
        },
        inicio: { tipo: "number", nome: "Começar em", padrao: "1" },
        formato: {
          tipo: "select", nome: "Formato",
          valores: [
            { v: "n", t: "1" },
            { v: "pag", t: "Página 1" },
            { v: "nden", t: "1 / N" }
          ],
          padrao: "n"
        },
        tamanho: {
          tipo: "select", nome: "Tamanho da fonte",
          valores: [{ v: "9", t: "9 pt" }, { v: "11", t: "11 pt" }, { v: "14", t: "14 pt" }],
          padrao: "11"
        }
      },
      processar: async function (arquivos, opts) {
        var doc = await PDFLib.PDFDocument.load(await arquivos[0].arrayBuffer());
        var fonte = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        var total = doc.getPageCount();
        var inicio = parseInt(opts.inicio, 10) || 1;
        var tam = parseFloat(opts.tamanho);
        doc.getPages().forEach(function (p, i) {
          var n = inicio + i;
          var texto = opts.formato === "n" ? String(n)
            : opts.formato === "pag" ? "Página " + n
            : n + " / " + (inicio + total - 1);
          var pos = POSICAO[opts.posicao](p.getWidth(), p.getHeight());
          var largura = fonte.widthOfTextAtSize(texto, tam);
          var alvoX = pos.x === p.getWidth() - MARGEM_TEXTO ? pos.x - largura
            : pos.x === p.getWidth() / 2 ? pos.x - largura / 2 : pos.x;
          p.drawText(texto, { x: alvoX, y: pos.y, size: tam, font: fonte, color: PDFLib.rgb(0.28, 0.27, 0.27) });
        });
        var bytes = await doc.save({ useObjectStreams: true });
        return [baixar(new Blob([bytes], { type: "application/pdf" }),
          arquivos[0].name.replace(/\.pdf$/i, "") + "-numerado.pdf")];
      }
    }
  };

  /* =====================================================================
     HELPERS — leitura e geração (pdf.js, JSZip, docx, pptxgenjs, XLSX)
     ===================================================================== */

  function blobParaBytes(arquivo) {
    return arquivo.arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }

  /* pdf.js: configura worker e abre documento */
  var LEITOR = (function () {
    if (typeof pdfjsLib === "undefined") return null;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
    return pdfjsLib;
  })();

  function abrirPdf(arquivo) {
    if (!LEITOR) throw new Error("Leitor de PDF (pdf.js) não carregou — verifique a conexão e recarregue.");
    return blobParaBytes(arquivo).then(function (bytes) {
      return LEITOR.getDocument({ data: bytes }).promise;
    });
  }

  /* agrupa itens de texto por linha (Y), ordena por X */
  function agruparLinhas(itens) {
    var mapa = {};
    var grupos = [];
    itens.forEach(function (it) {
      if (!it.str || !it.str.trim()) return;
      var y = Math.round(it.transform[5] / 2) * 2;
      if (!mapa[y]) { mapa[y] = []; grupos.push(mapa[y]); }
      mapa[y].push(it);
    });
    grupos.sort(function (a, b) { return b[0].transform[5] - a[0].transform[5]; });
    return grupos.map(function (g) {
      g.sort(function (a, b) { return a.transform[4] - b.transform[4]; });
      var linha = "", fimAnterior = null;
      g.forEach(function (it) {
        if (fimAnterior !== null && it.transform[4] - fimAnterior > 1 &&
            !/\s$/.test(linha) && !/^\s/.test(it.str)) linha += " ";
        linha += it.str;
        fimAnterior = it.transform[4] + it.width;
      });
      return linha.replace(/\s+/g, " ").trim();
    }).filter(function (l) { return l; });
  }

  /* extrai as linhas de texto de cada página: [[linha, linha], ...] */
  async function extrairTexto(arquivo) {
    var doc = await abrirPdf(arquivo);
    var paginas = [];
    for (var i = 1; i <= doc.numPages; i++) {
      var pag = await doc.getPage(i);
      var tc = await pag.getTextContent();
      paginas.push({ numero: i, linhas: agruparLinhas(tc.items) });
    }
    return paginas;
  }

  /* renderiza página de PDF em JPEG (para imagem em docx/pptx/jpg) */
  async function renderPaginaJpeg(pag, escala, qualidade) {
    var viewport = pag.getViewport({ scale: escala });
    var canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pag.render({ canvasContext: ctx, viewport: viewport }).promise;
    var blob = await new Promise(function (res, rej) {
      canvas.toBlob(function (b) { return b ? res(b) : rej(new Error("Falha ao renderizar página.")); },
        "image/jpeg", qualidade || 0.92);
    });
    return { blob: blob, largura: viewport.width, altura: viewport.height };
  }

  function decodificarXml(t) {
    return t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"")
      .replace(/&apos;/g, "'").replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(+d); })
      .replace(/&amp;/g, "&");
  }

  /* desenha linhas de texto em um PDF novo (A4), quebrando e paginando */
  async function linhasParaPdf(linhas, nome, grandes) {
    var doc = await PDFLib.PDFDocument.create();
    var A4W = 595.28, A4H = 841.89;
    var fonte = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    var fonteTitulo = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    var tam = grandes ? 12 : 11;
    var entre = grandes ? 6 : 4.5;
    var y = A4H - 60;
    var pag = doc.addPage([A4W, A4H]);
    function novaPag() { pag = doc.addPage([A4W, A4H]); y = A4H - 60; }
    function desenha(t, forte) {
      var f = forte ? fonteTitulo : fonte;
      var wMax = A4W - 2 * MARGEM_TEXTO;
      if (f.widthOfTextAtSize(t, tam) <= wMax) {
        if (y < 60) novaPag();
        pag.drawText(t, { x: MARGEM_TEXTO, y: y, size: tam, font: f, color: PDFLib.rgb(0.13, 0.13, 0.13) });
        y -= tam + entre;
        return;
      }
      var palavras = t.split(" ");
      var atual = "";
      palavras.forEach(function (pw) {
        var teste = atual ? atual + " " + pw : pw;
        if (f.widthOfTextAtSize(teste, tam) > wMax) {
          if (y < 60) novaPag();
          pag.drawText(atual, { x: MARGEM_TEXTO, y: y, size: tam, font: f, color: PDFLib.rgb(0.13, 0.13, 0.13) });
          y -= tam + entre;
          atual = pw;
        } else atual = teste;
      });
      if (atual) {
        if (y < 60) novaPag();
        pag.drawText(atual, { x: MARGEM_TEXTO, y: y, size: tam, font: f, color: PDFLib.rgb(0.13, 0.13, 0.13) });
        y -= tam + entre;
      }
    }
    linhas.forEach(function (l) {
      var texto = typeof l === "string" ? l : (l && typeof l.texto === "string" ? l.texto : "");
      if (texto === "" && (l === "" || (l && typeof l === "object"))) { y -= (tam + entre) / 2; return; }
      if (!texto) return;
      desenha(texto, !!(l && l.grande));
    });
    var bytes = await doc.save({ useObjectStreams: true });
    return baixar(new Blob([bytes], { type: "application/pdf" }), nome);
  }

  /* =====================================================================
     FERRAMENTAS DE CONVERSÃO E EDIÇÃO AVANÇADA
     ===================================================================== */

  /* ---- PDF para WORD ---- */
  TOOLS["pdf-para-word"] = {
    titulo: "PDF para Word", accept: ".pdf,application/pdf", multi: true,
    textoZona: "Selecione o arquivo PDF",
    opcoes: {
      modo: {
        tipo: "radio", nome: "Conteúdo do Word",
        valores: [
          { v: "texto", t: "Texto editável" },
          { v: "imagem", t: "Páginas como imagem (visual fiel)" }
        ],
        padrao: "texto"
      }
    },
    processar: async function (arquivos, opts) {
      var saidas = [];
      for (var i = 0; i < arquivos.length; i++) {
        var paginas = await extrairTexto(arquivos[i]);
        var temTexto = paginas.some(function (p) { return p.linhas.length; });
        if (opts.modo === "imagem" || !temTexto) {
          var docPdf = await abrirPdf(arquivos[i]);
          var blocos = [];
          for (var n = 1; n <= docPdf.numPages; n++) {
            var pag = await docPdf.getPage(n);
            var r = await renderPaginaJpeg(pag, 2, 0.9);
            var bytes = new Uint8Array(await r.blob.arrayBuffer());
            var largPx = 600, altPx = Math.round(largPx * r.altura / r.largura);
            blocos.push(new docx.Paragraph({
              children: [new docx.ImageRun({ data: bytes, transformation: { width: largPx, height: altPx } })]
            }));
          }
          var docW = new docx.Document({ sections: [{ properties: {}, children: blocos }] });
          saidas.push(baixar(await docx.Packer.toBlob(docW),
            arquivos[i].name.replace(/\.pdf$/i, "") + ".docx"));
        } else {
          var filhos = [new docx.Paragraph({ children: [new docx.TextRun({ text: arquivos[i].name.replace(/\.pdf$/i, ""), bold: true, size: 28 })] })];
          paginas.forEach(function (p) {
            filhos.push(new docx.Paragraph({ children: [new docx.TextRun({ text: "Página " + p.numero, color: "999999", size: 18 })] }));
            p.linhas.forEach(function (l) {
              filhos.push(new docx.Paragraph({ children: [new docx.TextRun({ text: l, size: 22 })] }));
            });
          });
          var docW2 = new docx.Document({ sections: [{ properties: {}, children: filhos }] });
          saidas.push(baixar(await docx.Packer.toBlob(docW2),
            arquivos[i].name.replace(/\.pdf$/i, "") + ".docx"));
        }
      }
      return saidas;
    }
  };

  /* ---- WORD para PDF ---- */
  TOOLS["word-para-pdf"] = {
    titulo: "Word para PDF", accept: ".docx", multi: true,
    textoZona: "Selecione o arquivo Word (.docx)",
    opcoes: null,
    processar: async function (arquivos) {
      if (!window.JSZip) throw new Error("Biblioteca JSZip não carregou — verifique a conexão e recarregue.");
      var saidas = [];
      for (var i = 0; i < arquivos.length; i++) {
        var zip = await JSZip.loadAsync(await arquivos[i].arrayBuffer());
        var xmlArq = zip.file("word/document.xml");
        if (!xmlArq) throw new Error('"' + arquivos[i].name + '" não parece um .docx válido.');
        var xml = await xmlArq.async("string");
        var parags = xml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>|<w:p\b[^>]*\/>/g) || [];
        var linhas = parags.map(function (p) {
          var ts = p.match(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g) || [];
          return decodificarXml(ts.join("").replace(/<[^>]+>/g, ""));
        });
        while (linhas.length && !linhas[0]) linhas.shift();
        if (!linhas.some(Boolean)) throw new Error('"' + arquivos[i].name + '" não contém texto extraível.');
        saidas.push(await linhasParaPdf(linhas, arquivos[i].name.replace(/\.docx$/i, "") + ".pdf"));
      }
      return saidas;
    }
  };

  /* ---- PDF para EXCEL ---- */
  TOOLS["pdf-para-excel"] = {
    titulo: "PDF para Excel", accept: ".pdf,application/pdf", multi: true,
    textoZona: "Selecione o arquivo PDF",
    opcoes: null,
    processar: async function (arquivos) {
      if (!window.XLSX) throw new Error("Biblioteca XLSX não carregou — verifique a conexão e recarregue.");
      var saidas = [];
      for (var i = 0; i < arquivos.length; i++) {
        var paginas = await extrairTexto(arquivos[i]);
        var linhasTodas = [];
        linhasTodas.push(["Página", "Conteúdo"]);
        paginas.forEach(function (p) {
          if (!p.linhas.length) linhasTodas.push([String(p.numero), "(página sem texto)"]);
          p.linhas.forEach(function (l) { linhasTodas.push([String(p.numero), l]); });
        });
        var ws = XLSX.utils.aoa_to_sheet(linhasTodas);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PDF");
        var bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        saidas.push(baixar(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          arquivos[i].name.replace(/\.pdf$/i, "") + ".xlsx"));
      }
      return saidas;
    }
  };

  /* ---- EXCEL para PDF ---- */
  TOOLS["excel-para-pdf"] = {
    titulo: "Excel para PDF", accept: ".xlsx,.xls,.csv", multi: true,
    textoZona: "Selecione a planilha (XLSX, XLS ou CSV)",
    opcoes: null,
    processar: async function (arquivos) {
      if (!window.XLSX) throw new Error("Biblioteca XLSX não carregou — verifique a conexão e recarregue.");
      var saidas = [];
      for (var i = 0; i < arquivos.length; i++) {
        var wb = XLSX.read(await arquivos[i].arrayBuffer(), { type: "array" });
        var linhas = [{ texto: arquivos[i].name.replace(/\.(xlsx|xls|csv)$/i, ""), grande: true }];
        wb.SheetNames.forEach(function (nome) {
          linhas.push({ texto: "Planilha: " + nome, grande: true });
          var linhasPlan = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: false });
          linhasPlan.forEach(function (linha) {
            var txt = (linha || []).map(function (c) { return c == null ? "" : String(c); }).join("  |  ");
            linhas.push({ texto: txt });
          });
        });
        if (linhas.length < 2) throw new Error('"' + arquivos[i].name + '" está vazia ou não pôde ser lida.');
        saidas.push(await linhasParaPdf(linhas, arquivos[i].name.replace(/\.(xlsx|xls|csv)$/i, "") + ".pdf", true));
      }
      return saidas;
    }
  };

  function blobParaBase64(blob) {
    return blob.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      var binario = "";
      var passo = 8192;
      for (var i = 0; i < bytes.length; i += passo) {
        binario += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + passo, bytes.length)));
      }
      return btoa(binario);
    });
  }

  /* ---- PDF para POWERPOINT ---- */
  TOOLS["pdf-para-powerpoint"] = {
    titulo: "PDF para PowerPoint", accept: ".pdf,application/pdf", multi: true,
    textoZona: "Selecione o arquivo PDF",
    opcoes: null,
    processar: async function (arquivos) {
      if (!window.PptxGenJS) throw new Error("Biblioteca PptxGenJS não carregou — verifique a conexão e recarregue.");
      var saidas = [];
      for (var i = 0; i < arquivos.length; i++) {
        var docPdf = await abrirPdf(arquivos[i]);
        var pptx = new PptxGenJS();
        pptx.defineLayout({ name: "LUME_FULL", width: 13.333, height: 7.5 });
        pptx.layout = "LUME_FULL";
        for (var n = 1; n <= docPdf.numPages; n++) {
          var pag = await docPdf.getPage(n);
          var r = await renderPaginaJpeg(pag, 2, 0.9);
          var b64 = await blobParaBase64(r.blob);
          var slide = pptx.addSlide();
          slide.addImage({
            data: "image/jpeg;base64," + b64,
            x: 0, y: 0, w: 13.333, h: 7.5
          });
        }
        var blob = await pptx.write({ outputType: "blob" });
        saidas.push(baixar(blob, arquivos[i].name.replace(/\.pdf$/i, "") + ".pptx"));
      }
      return saidas;
    }
  };

  /* ---- POWERPOINT para PDF ---- */
  TOOLS["powerpoint-para-pdf"] = {
    titulo: "PowerPoint para PDF", accept: ".pptx,.ppt", multi: true,
    textoZona: "Selecione a apresentação (.pptx)",
    opcoes: null,
    processar: async function (arquivos) {
      if (!window.JSZip) throw new Error("Biblioteca JSZip não carregou — verifique a conexão e recarregue.");
      var saidas = [];
      for (var i = 0; i < arquivos.length; i++) {
        var zip = await JSZip.loadAsync(await arquivos[i].arrayBuffer());
        var nomes = Object.keys(zip.files).filter(function (n) { return /^ppt\/slides\/slide\d+\.xml$/.test(n); })
          .sort(function (a, b) { return (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]); });
        if (!nomes.length) throw new Error('"' + arquivos[i].name + '" não parece um .pptx válido (ou é .ppt antigo).');
        var doc = await PDFLib.PDFDocument.create();
        var fonte = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        var fonteTit = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        var W = 841.89, H = 595.28, tam = 12, tamTit = 16;
        for (var s = 0; s < nomes.length; s++) {
          var xml = await zip.file(nomes[s]).async("string");
          var textos = (xml.match(/<a:t>([\s\S]*?)<\/a:t>/g) || [])
            .map(function (t) { return decodificarXml(t.replace(/<\/?a:t>/g, "")).trim(); })
            .filter(Boolean);
          var pag = doc.addPage([W, H]);
          var y = H - 70;
          if (!textos.length) continue;
          for (var t = 0; t < textos.length; t++) {
            if (t === 0 && textos.length > 1) {
              pag.drawText(textos[t], { x: MARGEM_TEXTO, y: y, size: tamTit, font: fonteTit, color: PDFLib.rgb(0.13, 0.13, 0.13) });
              y -= tamTit + 14;
              continue;
            }
            var f = textos.length <= 1 ? fonteTit : fonte;
            var tamanhoTexto = textos.length <= 1 ? tamTit : tam;
            var palavras = textos[t].split(/\s+/);
            var atual = "";
            for (var pw = 0; pw <= palavras.length; pw++) {
              var teste = pw < palavras.length ? (atual ? atual + " " + palavras[pw] : palavras[pw]) : null;
              if (teste && f.widthOfTextAtSize(teste, tamanhoTexto) <= W - MARGEM_TEXTO * 2) { atual = teste; continue; }
              if (atual) {
                if (y < 50) { pag = doc.addPage([W, H]); y = H - 70; }
                pag.drawText(atual, { x: MARGEM_TEXTO, y: y, size: tamanhoTexto, font: f, color: PDFLib.rgb(0.13, 0.13, 0.13) });
                y -= tamanhoTexto + 4.5;
              }
              atual = pw < palavras.length ? palavras[pw] : "";
            }
          }
        }
        var bytes = await doc.save({ useObjectStreams: true });
        saidas.push(baixar(new Blob([bytes], { type: "application/pdf" }),
          arquivos[i].name.replace(/\.pptx$/i, "") + ".pdf"));
      }
      return saidas;
    }
  };

  /* ---- PDF para JPG ---- */
  TOOLS["pdf-para-jpg"] = {
    titulo: "PDF para JPG", accept: ".pdf,application/pdf", multi: true,
    textoZona: "Selecione o arquivo PDF",
    opcoes: {
      dpi: {
        tipo: "select", nome: "Qualidade",
        valores: [
          { v: "1.5", t: "Padrão (108 dpi)" },
          { v: "3", t: "Alta (216 dpi)" },
          { v: "5", t: "Máxima (360 dpi)" }
        ],
        padrao: "1.5"
      }
    },
    processar: async function (arquivos, opts) {
      var saidas = [];
      for (var i = 0; i < arquivos.length; i++) {
        var docPdf = await abrirPdf(arquivos[i]);
        var base = arquivos[i].name.replace(/\.pdf$/i, "");
        for (var n = 1; n <= docPdf.numPages; n++) {
          var pag = await docPdf.getPage(n);
          var r = await renderPaginaJpeg(pag, parseFloat(opts.dpi), 0.92);
          saidas.push(baixar(r.blob, base + "-pag" + n + ".jpg"));
        }
      }
      return saidas;
    }
  };

  /* ---- MARCA D'ÁGUA ---- */
  TOOLS["marca-dagua"] = {
    titulo: "Marca d'água", accept: ".pdf,application/pdf", multi: true,
    textoZona: "Selecione o arquivo PDF",
    opcoes: {
      texto: { tipo: "text", nome: "Texto da marca", padrao: "CONFIDENCIAL", ajuda: "Aplicado em todas as páginas" },
      cor: {
        tipo: "select", nome: "Cor",
        valores: [
          { v: "cinza", t: "Cinza" }, { v: "azul", t: "Azul Lume" }, { v: "preto", t: "Preto" }
        ],
        padrao: "cinza"
      },
      opacidade: {
        tipo: "select", nome: "Opacidade",
        valores: [{ v: "0.12", t: "12% — sutil" }, { v: "0.2", t: "20%" }, { v: "0.35", t: "35% — forte" }],
        padrao: "0.12"
      },
      posicao: {
        tipo: "radio", nome: "Posição",
        valores: [
          { v: "diagonal", t: "Diagonal" },
          { v: "horizontal", t: "Horizontal ao centro" },
          { v: "rodape", t: "Rodapé" }
        ],
        padrao: "diagonal"
      }
    },
    processar: async function (arquivos, opts) {
      var texto = (opts.texto || "").trim();
      if (!texto) throw new Error("Digite o texto da marca d'água.");
      var cores = {
        cinza: [0.62, 0.6, 0.58],
        azul: [0.15, 0.39, 0.92],
        preto: [0.1, 0.1, 0.1]
      };
      var cor = cores[opts.cor] || cores.cinza;
      var opac = parseFloat(opts.opacidade) || 0.12;
      var saidas = [];
      for (var i = 0; i < arquivos.length; i++) {
        var doc = await PDFLib.PDFDocument.load(await arquivos[i].arrayBuffer());
        var fonte = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        doc.getPages().forEach(function (p) {
          var w = p.getWidth(), h = p.getHeight();
          var tam = Math.min(64, Math.max(14, texto.length * 5.6, w / 22));
          var largura = fonte.widthOfTextAtSize(texto, tam);
          var optsDesenho = { size: tam, font: fonte, opacity: opac, color: PDFLib.rgb(cor[0], cor[1], cor[2]) };
          if (opts.posicao === "diagonal") {
            p.drawText(texto, {
              x: w / 2 - largura / 2 + h * 0.18, y: h / 2 - tam,
              rotate: PDFLib.degrees(45), opacity: opac, font: fonte,
              size: tam, color: PDFLib.rgb(cor[0], cor[1], cor[2])
            });
          } else if (opts.posicao === "rodape") {
            p.drawText(texto, {
              x: 24, y: 16, opacity: Math.min(1, opac * 2.2),
              font: fonte, size: Math.max(9, tam / 4), color: PDFLib.rgb(cor[0], cor[1], cor[2])
            });
          } else {
            p.drawText(texto, {
              x: w / 2 - largura / 2, y: h / 2 - tam / 2,
              font: fonte, size: tam, opacity: opac, color: PDFLib.rgb(cor[0], cor[1], cor[2])
            });
          }
        });
        var bytes = await doc.save({ useObjectStreams: true });
        saidas.push(baixar(new Blob([bytes], { type: "application/pdf" }),
          arquivos[i].name.replace(/\.pdf$/i, "") + "-marca.pdf"));
      }
      return saidas;
    }
  };

  /* ---- REPARAR ---- */
  TOOLS["reparar"] = {
    titulo: "Reparar PDF", accept: ".pdf,application/pdf", multi: true,
    textoZona: "Selecione o arquivo PDF",
    opcoes: null,
    processar: async function (arquivos) {
      var saidas = [];
      for (var i = 0; i < arquivos.length; i++) {
        var bytesNovos;
        try {
          var doc = await PDFLib.PDFDocument.load(await arquivos[i].arrayBuffer(), { ignoreEncryption: false });
          doc.setProducer("LumePDF"); doc.setCreator("LumePDF");
          bytesNovos = await doc.save({ useObjectStreams: true });
        } catch (e1) {
          try {
            var doc2 = await PDFLib.PDFDocument.load(await arquivos[i].arrayBuffer(), { ignoreEncryption: true, throwOnInvalidObject: false });
            doc2.setProducer("LumePDF"); doc2.setCreator("LumePDF");
            bytesNovos = await doc2.save({ useObjectStreams: true });
          } catch (e2) {
            throw new Error('"' + arquivos[i].name + '" está danificado além do reparo local (' + (e2 && e2.message || "erro desconhecido") + ').');
          }
        }
        var nó = baixar(new Blob([bytesNovos], { type: "application/pdf" }),
          arquivos[i].name.replace(/\.pdf$/i, "") + "-reparado.pdf");
        nó.desc = "Estrutura reconstruída e metadados normalizados.";
        saidas.push(nó);
      }
      return saidas;
    }
  };

  var TOOL = TOOLS[ID];
  if (!TOOL) { console.error("Ferramenta desconhecida: " + ID); return; }

  /* ---------------- estado + DOM ---------------- */
  var state = { arquivos: [] };

  var app = document.getElementById("app");
  app.innerHTML =
    '<div class="zona" id="zona">' +
      '<div class="zona-icone"><svg viewBox="0 0 24 24">' +
        '<path d="M12 16V4m0 0 4 4m-4-4L8 8"/>' +
        '<path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>' +
      "</svg></div>" +
      '<strong id="zonaTxt">' + esc(TOOL.textoZona) + "</strong>" +
      '<span>ou arraste e solte aqui — os arquivos não saem do seu computador</span>' +
      '<input type="file" id="inputArq" accept="' + esc(TOOL.accept) + '"' + (TOOL.multi ? " multiple" : "") + " hidden>" +
    "</div>" +
    '<div class="lista-arquivos" id="lista"></div>' +
    '<div class="opcoes" id="painelOpcoes"' + (TOOL.opcoes ? "" : " hidden") + ">" +
      (TOOL.descricaoOpcoes ? '<p class="ajuda-opcao" style="margin-bottom:12px">' + esc(TOOL.descricaoOpcoes) + "</p>" : "") +
      '<h3>Opções</h3><div id="opcoes"></div>' +
    "</div>" +
    '<div class="ferr-rodape">' +
      '<button class="btn-barra" id="btnAcao" disabled>Processar</button>' +
    "</div>" +
    '<div class="status" id="status" hidden></div>' +
    '<div class="resultados" id="resultados"></div>';

  var zona = document.getElementById("zona");
  var inputArq = document.getElementById("inputArq");
  var lista = document.getElementById("lista");
  var opcoesDiv = document.getElementById("opcoes");
  var btnAcao = document.getElementById("btnAcao");
  var statusEl = document.getElementById("status");
  var resultadosEl = document.getElementById("resultados");

  /* HTML de ícone de documento usado nas linhas */
  var ICO_DOC =
    '<svg class="arquivo-ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4z"/><path d="M15 4v5h5"/><path d="M9 13h6M9 17h6"/></svg>';

  /* ---------------- opções ---------------- */
  var valoresOpts = {};
  function montarOpcoes() {
    if (!TOOL.opcoes) { valoresOpts = {}; return; }
    var html = "";
    Object.keys(TOOL.opcoes).forEach(function (chave) {
      var o = TOOL.opcoes[chave];
      valoresOpts[chave] = o.padrao;
      if (o.tipo === "radio") {
        html += '<div class="opcao"><label>' + esc(o.nome) +
          '<span class="ajuda-opcao">' + (o.ajuda || "") + "</span></label>" +
          '<div class="opcao-radio" data-opt="' + esc(chave) + '">' +
          o.valores.map(function (v) {
            return '<label><input type="radio" name="opt-' + esc(chave) + '" value="' + esc(v.v) + '"' +
              (v.v === o.padrao ? " checked" : "") + "> " + esc(v.t) + "</label>";
          }).join("") + "</div></div>";
      } else if (o.tipo === "select") {
        html += '<div class="opcao"><label for="opt-' + esc(chave) + '">' + esc(o.nome) + "</label>" +
          '<select id="opt-' + esc(chave) + '" data-opt="' + esc(chave) + '">' +
          o.valores.map(function (v) {
            return '<option value="' + esc(v.v) + '"' + (v.v === o.padrao ? " selected" : "") + ">" + esc(v.t) + "</option>";
          }).join("") + "</select></div>";
      } else {
        html += '<div class="opcao"><label for="opt-' + esc(chave) + '">' + esc(o.nome) +
          '<span class="ajuda-opcao">' + (o.ajuda || "") + "</span></label>" +
          '<input id="opt-' + esc(chave) + '" type="' + o.tipo + '" data-opt="' + esc(chave) +
          '" value="' + esc(o.padrao) + '"></div>';
      }
    });
    opcoesDiv.innerHTML = html;
    opcoesDiv.querySelectorAll("[data-opt]").forEach(function (el) {
      el.addEventListener("change", function () {
        var t = el.getAttribute("data-opt");
        valoresOpts[t] = el.type === "radio" ? opcoesDiv.querySelector('input[name="opt-' + t + '"]:checked').value : el.value;
        var def = TOOL.opcoes[t];
        if (t === "modo" && ID === "dividir") {
          var campo = document.getElementById("opt-intervalo");
          if (campo) campo.closest(".opcao").style.display = valoresOpts.modo === "cada" ? "none" : "";
        }
      });
    });
  }
  montarOpcoes();

  /* ---------------- arquivos ---------------- */
  function renderLista() {
    lista.innerHTML = state.arquivos.map(function (f, i) {
      var ops = "";
      if (TOOL.multi) {
        if (i > 0) ops += '<a href="#" data-mover="' + i + '" data-dir="-1" class="arquivo-btn" title="Mover para cima">\u2191</a>';
        if (i < state.arquivos.length - 1) ops += '<a href="#" data-mover="' + i + '" data-dir="1" class="arquivo-btn" title="Mover para baixo">\u2193</a>';
      }
      ops += '<a href="#" data-remover="' + i + '" class="arquivo-btn" title="Remover">\u2715</a>';
      return '<div class="arquivo-linha">' + ICO_DOC +
        '<span class="arquivo-nome">' + esc(f.name) + "</span>" +
        '<span class="arquivo-tam">' + fmtTam(f.size) + "</span>" + ops + "</div>";
    }).join("");
    lista.querySelectorAll("[data-remover]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        state.arquivos.splice(parseInt(a.getAttribute("data-remover"), 10), 1);
        renderLista();
      });
    });
    lista.querySelectorAll("[data-mover]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var i = parseInt(a.getAttribute("data-mover"), 10);
        var d = parseInt(a.getAttribute("data-dir"), 10);
        var temp = state.arquivos[i];
        state.arquivos[i] = state.arquivos[i + d];
        state.arquivos[i + d] = temp;
        renderLista();
      });
    });
    btnAcao.disabled = state.arquivos.length === 0;
    if (state.arquivos.length > 1 && !TOOL.multi) {
      statusEl.hidden = false;
      statusEl.className = "status erro";
      statusEl.textContent = "Esta ferramenta aceita apenas 1 arquivo por vez.";
    }
  }

  function aceitar(novos) {
    var listaNova = Array.prototype.slice.call(novos);
    state.arquivos = TOOL.multi ? state.arquivos.concat(listaNova) : listaNova.slice(0, 1);
    statusEl.hidden = true;
    renderLista();
  }

  zona.addEventListener("click", function () { inputArq.click(); });
  inputArq.addEventListener("change", function () { aceitar(inputArq.files); inputArq.value = ""; });
  zona.addEventListener("dragover", function (e) { e.preventDefault(); zona.classList.add("arrastando"); });
  zona.addEventListener("dragleave", function () { zona.classList.remove("arrastando"); });
  zona.addEventListener("drop", function (e) {
    e.preventDefault();
    zona.classList.remove("arrastando");
    aceitar(e.dataTransfer.files);
  });

  /* ---------------- processar ---------------- */
  btnAcao.addEventListener("click", async function () {
    if (!state.arquivos.length) return;
    btnAcao.disabled = true;
    btnAcao.textContent = "Processando\u2026";
    statusEl.hidden = false;
    statusEl.className = "";
    statusEl.textContent = "Trabalhando no seu navegador\u2026";
    resultadosEl.innerHTML = "";
    try {
      var resultados = await TOOL.processar(state.arquivos, valoresOpts);
      statusEl.hidden = false;
      statusEl.className = "status ok";
      statusEl.textContent = "Conclu\u00EDdo! Baixe o arquivo abaixo.";
      resultadosEl.innerHTML = resultados.map(function (r) {
        return '<div class="resultado-card">' +
          '<span class="arquivo-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg></span>' +
          '<span class="arquivo-nome"><strong>' + esc(r.nome) + "</strong>" +
          '<span class="arquivo-tam" style="display:block">' + esc(r.tamanho) + (r.desc ? "<br>" + esc(r.desc) : "") +
          '</span></span>' +
          '<a href="' + r.url + '" download="' + esc(r.nome) + '">Baixar</a></div>';
      }).join("");
    } catch (erro) {
      statusEl.hidden = false;
      statusEl.className = "status erro";
      var msg = erro && erro.message ? erro.message : "Erro ao processar o arquivo.";
      if (/password|Encrypted|encrypt/i.test(msg))
        msg = "Este PDF \u00E9 protegido por senha \u2014 remova a prote\u00E7\u00E3o antes de continuar.";
      else if (/JPG|jpeg|formato/im.test(msg))
        msg = "Formato de imagem n\u00E3o suportado. Use JPG ou PNG.";
      statusEl.textContent = "Erro: " + msg;
    }
    btnAcao.disabled = state.arquivos.length === 0;
    btnAcao.textContent = "Processar";
  });
})();
