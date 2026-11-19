/* LUMEPDF — comum.js
   Injeta header/footer compartilhados em todas as páginas + abas de filtro. */

(function () {
  "use strict";

  var GLYPH =
    '<span class="marca-glyph"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 2 6 13h4.5L10 22l7.5-11.5H13L13 2z" fill="#fff"/></svg></span>';

  function marca(classe) {
    return (
      '<a class="' + classe + '" href="index.html">' + GLYPH +
      'Lume<em>PDF</em></a>'
    );
  }

  var ICONE_DOC =
    '<svg viewBox="0 0 24 24"><path d="M9 4h6l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4z"/>' +
    '<path d="M15 4v5h5"/><path d="M9 13h6M9 17h6"/></svg>';

  var topo = document.createElement("header");
  topo.className = "topo";
  topo.innerHTML =
    '<div class="topo-int">' +
      marca("marca") +
      '<nav class="menu">' +
        '<a href="index.html#ferramentas">Ferramentas</a>' +
        '<a href="index.html#trabalhe">Trabalhe do seu jeito</a>' +
        '<a href="index.html#sobre">Por que gr&aacute;tis?</a>' +
        '<a href="index.html#sobre">Sobre n&oacute;s</a>' +
      "</nav>" +
    "</div>";
  document.body.prepend(topo);

  var rodape = document.createElement("footer");
  rodape.className = "rodape";
  rodape.innerHTML =
    '<div class="rodape-int">' +
      '<div class="rodape-grid">' +
        '<div>' +
          '<div class="rodape-marca">' + GLYPH + "Lume<em>PDF</em></div>" +
          '<p style="font-size:.9rem">Ferramentas PDF que iluminam o seu trabalho. Rápidas, privadas e direto no navegador.</p>' +
        "</div>" +
        '<div><h4>Produto</h4><ul>' +
          '<li><a href="index.html">Página inicial</a></li>' +
          '<li><a href="index.html#ferramentas">Ferramentas</a></li>' +
          '<li><a href="index.html#trabalhe">Grátis para sempre</a></li>' +
          '<li><a href="index.html#sobre">Sobre nós</a></li>' +
        "</ul></div>" +
        '<div><h4>Ferramentas</h4><ul>' +
          '<li><a href="juntar.html">Juntar PDF</a></li>' +
          '<li><a href="dividir.html">Dividir PDF</a></li>' +
          '<li><a href="organizar.html">Organizar PDF</a></li>' +
          '<li><a href="comprimir.html">Comprimir PDF</a></li>' +
          '<li><a href="pdf-para-word.html">PDF para Word</a></li>' +
          '<li><a href="word-para-pdf.html">Word para PDF</a></li>' +
          '<li><a href="pdf-para-excel.html">PDF para Excel</a></li>' +
          '<li><a href="excel-para-pdf.html">Excel para PDF</a></li>' +
          '<li><a href="pdf-para-powerpoint.html">PDF para PowerPoint</a></li>' +
          '<li><a href="powerpoint-para-pdf.html">PowerPoint para PDF</a></li>' +
          '<li><a href="pdf-para-jpg.html">PDF para JPG</a></li>' +
          '<li><a href="jpg-para-pdf.html">JPG para PDF</a></li>' +
          '<li><a href="rodar.html">Rodar PDF</a></li>' +
          '<li><a href="numerar.html">Números de página</a></li>' +
          '<li><a href="marca-dagua.html">Marca d\u2019\u00E1gua</a></li>' +
          '<li><a href="reparar.html">Reparar PDF</a></li>' +
        "</ul></div>" +
        '<div><h4>Legal</h4><ul>' +
          '<li><a href="index.html#sobre">Seguran\u00E7a</a></li>' +
          '<li><a href="index.html#sobre">Pol\u00EDtica de privacidade</a></li>' +
          '<li><a href="index.html#sobre">Termos e condi\u00E7\u00F5es</a></li>' +
          '<li><a href="index.html#sobre">Cookies</a></li>' +
        "</ul></div>" +
        '<div><h4>Empresa</h4><ul>' +
          '<li><a href="index.html#sobre">Sobre n\u00F3s</a></li>' +
          '<li><a href="index.html#sobre">Contato</a></li>' +
          '<li><a href="index.html#sobre">Imprensa</a></li>' +
          '<li><a href="index.html#sobre">Ajuda</a></li>' +
        "</ul></div>" +
      "</div>" +
      '<div class="rodape-base">' +
        '<span>&copy; 2026 LumePDF &reg; — Seu est\u00FAdio de PDF. Gr\u00E1tis para sempre.</span>' +
        '<span>Seus arquivos nunca saem do seu computador.</span>' +
      "</div>" +
    "</div>";
  document.body.appendChild(rodape);

  /* Abas de categoria: filtram o grid na home */
  var abas = document.querySelectorAll(".aba");
  if (abas.length) {
    abas.forEach(function (aba) {
      aba.addEventListener("click", function () {
        abas.forEach(function (a) { a.classList.remove("ativa"); });
        aba.classList.add("ativa");
        var cat = aba.getAttribute("data-cat");
        document.querySelectorAll(".card-ferramenta").forEach(function (card) {
          var cats = (card.getAttribute("data-cats") || "").split(",");
          var visivel = cat === "todas" || cats.indexOf(cat) !== -1;
          card.style.display = visivel ? "" : "none";
        });
      });
    });
  }
})();
