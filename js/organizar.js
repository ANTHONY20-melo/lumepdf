/* LUMEPDF — organizar.js
   Organizador visual de páginas: miniaturas renderizadas com pdf.js,
   reordenar (← →), rotacionar (⟳), excluir (✕) e exportar com pdf-lib. */

(function () {
  "use strict";

  if (typeof pdfjsLib === "undefined" || typeof PDFLib === "undefined") {
    document.getElementById("app").innerHTML =
      '<p class="status erro">Bibliotecas não carregaram — verifique a conexão e recarregue a página.</p>';
    return;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

  var app = document.getElementById("app");
  var estado = {
    documento: null,   /* pdf.js doc */
    docLib: null,      /* pdf-lib doc (para copiar páginas) */
    paginas: []        /* [{indice, rotacao}] */
  };

  app.innerHTML =
    '<div class="zona" id="zona">' +
      '<div class="zona-icone"><svg viewBox="0 0 24 24">' +
        '<rect x="3" y="4" width="8" height="16" rx="1"/><rect x="14" y="4" width="8" height="16" rx="1"/>' +
        '<path d="M6 9h2M6 12h2M17 9h2M17 12h2"/>' +
      "</svg></div>" +
      "<strong>Selecione o arquivo PDF</strong>" +
      "<span>ou arraste e solte aqui — você verá todas as páginas como miniaturas</span>" +
      '<input type="file" id="inputArq" accept=".pdf,application/pdf" hidden>' +
    "</div>" +
    '<div id="painelPaginas" hidden>' +
      '<div class="opcoes" style="margin-top:22px">' +
        '<h3>Páginas do documento <span id="contador"></span></h3>' +
        '<p class="ajuda-opcao" style="margin-bottom:12px">Use as setas para reordenar, &#10227; para rotacionar só a página e &#10005; para excluir. Depois gere o novo PDF.</p>' +
        '<div class="miniaturas" id="thumbs"></div>' +
      "</div>" +
      '<div class="ferr-rodape">' +
        '<button class="btn-ghost" id="btnLimpar">Escolher outro PDF</button>' +
        '<button class="btn-barra" id="btnAplicar">Organizar PDF</button>' +
      "</div>" +
    "</div>" +
    '<div class="status" id="status" hidden></div>' +
    '<div class="resultados" id="resultados"></div>';

  var zona = document.getElementById("zona");
  var inputArq = document.getElementById("inputArq");
  var painel = document.getElementById("painelPaginas");
  var thumbs = document.getElementById("thumbs");
  var contador = document.getElementById("contador");
  var btnAplicar = document.getElementById("btnAplicar");
  var statusEl = document.getElementById("status");
  var resultadosEl = document.getElementById("resultados");

  function statusTexto(txt, classe) {
    statusEl.hidden = !txt;
    statusEl.className = classe || "";
    statusEl.textContent = txt;
  }

  /* ---------- carregar ---------- */
  zona.addEventListener("click", function () { inputArq.click(); });
  inputArq.addEventListener("change", function () { if (inputArq.files[0]) carregar(inputArq.files[0]); inputArq.value = ""; });
  zona.addEventListener("dragover", function (e) { e.preventDefault(); zona.classList.add("arrastando"); });
  zona.addEventListener("dragleave", function () { zona.classList.remove("arrastando"); });
  zona.addEventListener("drop", function (e) {
    e.preventDefault(); zona.classList.remove("arrastando");
    if (e.dataTransfer.files[0]) carregar(e.dataTransfer.files[0]);
  });

  async function carregar(arquivo) {
    if (!/\.pdf$/i.test(arquivo.name) && arquivo.type !== "application/pdf") {
      statusTexto("O arquivo precisa ser um PDF.", "status erro"); return;
    }
    statusTexto("Lendo documento\u2026", "");
    resultadosEl.innerHTML = "";
    try {
      /* pdf.js "desanexa" o buffer recebido — copiar antes para não invalidar o pdf-lib */
      var bytesOriginais = new Uint8Array(await arquivo.arrayBuffer());
      var copiaLeitor = new Uint8Array(bytesOriginais);
      var copiaLib = new Uint8Array(bytesOriginais);
      estado.documento = await pdfjsLib.getDocument({ data: copiaLeitor }).promise;
      estado.docLib = await PDFLib.PDFDocument.load(copiaLib, { ignoreEncryption: true });
      estado.paginas = [];
      for (var i = 0; i < estado.documento.numPages; i++) {
        estado.paginas.push({ indice: i, rotacao: 0 });
      }
      zona.hidden = true;
      painel.hidden = false;
      statusTexto("");
      await renderizar();
    } catch (erro) {
      statusTexto("Erro ao abrir o PDF: " + (erro && erro.message || "arquivo inválido ou protegido."), "status erro");
    }
  }

  document.getElementById("btnLimpar").addEventListener("click", function () {
    estado.documento = null; estado.docLib = null; estado.paginas = [];
    painel.hidden = true; zona.hidden = false; resultadosEl.innerHTML = "";
  });

  /* ---------- miniaturas ---------- */
  async function renderizar() {
    contador.textContent = "(" + estado.paginas.length + ")";
    thumbs.innerHTML = "";
    statusTexto("Carregando miniaturas\u2026", "");
    for (var pos = 0; pos < estado.paginas.length; pos++) {
      var cfg = estado.paginas[pos];
      var div = document.createElement("div");
      div.className = "thumb";
      var numeroDoc = cfg.indice + 1;
      div.innerHTML =
        '<div class="thumb-frame"><span>pag. ' + numeroDoc + "</span></div>" +
        '<div class="thumb-rot">' + (cfg.rotacao % 360 !== 0 ? cfg.rotacao + "\u00B0" : "") + "</div>" +
        '<div class="thumb-ops">' +
          '<button data-mover="' + pos + '" data-dir="-1" title="Mover antes">\u2190</button>' +
          '<button data-mover="' + pos + '" data-dir="1" title="Mover depois">\u2192</button>' +
          '<button data-rot="' + pos + '" title="Rotacionar 90\u00B0">\u27F3</button>' +
          '<button data-excluir="' + pos + '" title="Excluir p\u00E1gina">\u2715</button>' +
        "</div>";
      thumbs.appendChild(div);
      /* renderiza a miniatura (imagem da página) */
      try {
        var pag = await estado.documento.getPage(numeroDoc);
        var base = pag.getViewport({ scale: 1 });
        var escala = 150 / base.width;
        var viewport = pag.getViewport({ scale: escala });
        var canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await pag.render({ canvasContext: ctx, viewport: viewport }).promise;
        var frame = div.querySelector(".thumb-frame");
        frame.innerHTML = "";
        frame.appendChild(canvas);
      } catch (eMini) { console.warn("thumb falhou:", eMini && eMini.message || eMini); }
    }
    statusTexto("");
    thumbs.querySelectorAll("[data-mover]").forEach(function (b) {
      b.addEventListener("click", function () {
        var pos = +b.getAttribute("data-mover"), dir = +b.getAttribute("data-dir");
        var alvo = pos + dir;
        if (alvo < 0 || alvo >= estado.paginas.length) return;
        var temp = estado.paginas[pos];
        estado.paginas[pos] = estado.paginas[alvo];
        estado.paginas[alvo] = temp;
        renderizar();
      });
    });
    thumbs.querySelectorAll("[data-rot]").forEach(function (b) {
      b.addEventListener("click", function () {
        var pos = +b.getAttribute("data-rot");
        estado.paginas[pos].rotacao = (estado.paginas[pos].rotacao + 90) % 360;
        renderizar();
      });
    });
    thumbs.querySelectorAll("[data-excluir]").forEach(function (b) {
      b.addEventListener("click", function () {
        estado.paginas.splice(+b.getAttribute("data-excluir"), 1);
        renderizar();
      });
    });
  }

  /* ---------- gerar ---------- */
  btnAplicar.addEventListener("click", async function () {
    if (!estado.docLib || !estado.paginas.length) return;
    btnAplicar.disabled = true;
    statusTexto("Organizando\u2026", "");
    try {
      var saida = await PDFLib.PDFDocument.create();
      var indices = estado.paginas.map(function (p) { return p.indice; });
      var copiadas = await saida.copyPages(estado.docLib, indices);
      estado.paginas.forEach(function (cfg, i) {
        if (cfg.rotacao % 360 !== 0) {
          var atual = (copiadas[i].getRotation().angle || 0) + cfg.rotacao;
          copiadas[i].setRotation(PDFLib.degrees(atual % 360));
        }
        saida.addPage(copiadas[i]);
      });
      var bytes = await saida.save({ useObjectStreams: true });
      var url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      statusTexto("Conclu\u00EDdo! Baixe o arquivo abaixo.", "status ok");
      resultadosEl.innerHTML =
        '<div class="resultado-card">' +
          '<span class="arquivo-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg></span>' +
          '<span class="arquivo-nome"><strong>lumpdf-organizado.pdf</strong>' +
          '<span class="arquivo-tam" style="display:block">' + bytes.length + " bytes \u2022 " + estado.paginas.length + ' p\u00E1ginas</span></span>' +
          '<a href="' + url + '" download="lumpdf-organizado.pdf">Baixar</a></div>';
    } catch (erro) {
      statusTexto("Erro: " + (erro && erro.message || "falha ao gerar o PDF."), "status erro");
    }
    btnAplicar.disabled = false;
  });
})();
