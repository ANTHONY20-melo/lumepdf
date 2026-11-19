/* LUMEPDF Desktop — processo principal Electron
   Carrega a interface local (index.html) em janela nativa,
   salva downloads automaticamente em Documentos\LumePDF e
   mantém tudo executando localmente (mesma privacidade do site). */

const { app, BrowserWindow, shell, session, Menu, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let janela = null;
const PASTA_DOWNLOADS = path.join(app.getPath("documents"), "LumePDF");

function importaModulos() {
  /* mantém o bundle simples: nada externo além do Electron */
  return { }; /* placeholder para futuros módulos nativos */
}

function definirMenu() {
  Menu.setApplicationMenu(null); /* interface já tem navegação própria */
}

function criarJanela() {
  janela = new BrowserWindow({
    width: 1240,
    height: 880,
    minWidth: 940,
    minHeight: 660,
    backgroundColor: "#f8f7f6",
    icon: path.join(__dirname, "icon.ico"),
    title: "LumePDF",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  janela.loadFile(path.join(__dirname, "..", "index.html"));
  janela.once("ready-to-show", () => janela.show());

  /* links externos (CDN da internet) abrem no navegador padrão */
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });

  janela.webContents.on("did-fail-load", (_e, codigo, descricao) => {
    dialog.showErrorBox("LumePDF", "Não foi possível carregar a interface.\n\n" + descricao + " (código " + codigo + ")");
  });
}

/* ---------- downloads: caixa "Salvar como" do Windows + feedback ---------- */
function configurarDownloads() {
  try { fs.mkdirSync(PASTA_DOWNLOADS, { recursive: true }); } catch (_) { /* já existe */ }

  session.defaultSession.on("will-download", (_evento, item) => {
    item.pause(); /* espera a caixa de diálogo antes de começar */

    // Adiciona timestamp ao nome para evitar sobrescrever arquivo anterior
    const nomeOriginal = item.getFilename();
    const ext = path.extname(nomeOriginal);
    const base = path.basename(nomeOriginal, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19); // 2026-11-18T14-30-00
    const nomeComTimestamp = base + "-" + timestamp + ext;

    const sugestao = path.join(PASTA_DOWNLOADS, nomeComTimestamp);
    const dialogo = janela && !janela.isDestroyed()
      ? dialog.showSaveDialog(janela, { title: "Salvar arquivo", defaultPath: sugestao })
      : dialog.showSaveDialog({ title: "Salvar arquivo", defaultPath: sugestao });

    dialogo.then(({ canceled, filePath }) => {
      if (canceled || !filePath) { item.cancel(); return; }
      item.setSavePath(filePath);
      item.resume();
      item.once("done", (_e2, estado) => {
        if (estado === "completed") {
          shell.showItemInFolder(filePath); /* destaca o arquivo salvo para o usuário */
        } else if (janela && !janela.isDestroyed()) {
          janela.setTitle("LumePDF — download do " + item.getFilename() + " falhou");
        }
      });
    });
  });
}

/* links arrastados para fora da janela não devem navegar de forma estranha */
app.on("web-contents-created", (_e, web) => {
  web.on("will-navigate", (evento, url) => {
    if (!url.startsWith("file:") && !url.startsWith("http://localhost") && !url.startsWith("https://localhost")) {
      evento.preventDefault();
    }
  });
});

app.whenReady().then(() => {
  definirMenu();
  configurarDownloads();
  criarJanela();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* evita segunda instância */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
app.on("second-instance", () => {
  if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus(); }
});

void ipcMain;
void importaModulos;
