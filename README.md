# LumePDF — Ferramentas PDF 100% Locais, Grátis, Privadas

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-33-47848F)](https://electronjs.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-6-119EFF)](https://capacitorjs.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8)](https://web.dev/progressive-web-apps/)

> **16 ferramentas PDF** que rodam **100% no seu navegador** — sem upload, sem cadastro, sem limite, **grátis para sempre**.

---

## ✨ Ferramentas Disponíveis

| Categoria | Ferramentas |
|-----------|-------------|
| **Organizar** | Juntar PDF, Dividir PDF, Organizar PDF (miniaturas visuais) |
| **Otimizar** | Comprimir PDF, Reparar PDF |
| **Converter** | PDF ↔ Word, PDF ↔ Excel, PDF ↔ PowerPoint, PDF → JPG, JPG → PDF |
| **Editar** | Rodar PDF, Números de página, Marca d'água |
| **Segurança** | Marca d'água, Reparar PDF |
| **Em breve** | Editar PDF (visual), OCR, Traduzir PDF |

---

## 🚀 Como Usar

### Web (navegador) — **Mais simples**
```bash
# Clone e rode localmente
git clone https://github.com/seu-usuario/lumepdf.git
cd lumepdf
npm install
npm run serve
# Abre em http://localhost:8086
```
Ou abra `index.html` diretamente no navegador (algumas ferramentas precisam de servidor local para CDN).

### Desktop (Windows) — **App nativo**
```bash
# Desenvolvimento
npm start

# Build instalador (.exe)
npm run dist
# Gera: dist/LumePDF Setup 1.0.0.exe
```

### Mobile (Android / iOS) — **App nativo via Capacitor**

#### Pré-requisitos
- **Android**: Android Studio + JDK 17+ + Node.js 18+
- **iOS**: macOS + Xcode 15+ + Apple Developer Program ($99/ano)

#### Build Automático (PowerShell)
```powershell
# Android APK
.\mobile-build.ps1 -Platform android -OpenIDE

# iOS (apenas macOS)
.\mobile-build.ps1 -Platform ios -OpenIDE

# Ambos
.\mobile-build.ps1 -Platform all
```

#### Build Manual (Passo a passo)
```bash
# 1. Instala dependências
npm install

# 2. Inicializa Capacitor (primeira vez)
npx cap init "LumePDF" "com.anthotec.lumepdf" --web-dir=.

# 3. Adiciona plataformas
npx cap add android   # Android
npx cap add ios       # iOS (macOS only)

# 4. Sincroniza web -> nativo
npx cap sync android
npx cap sync ios

# 5. Abre IDE para build final
npx cap open android  # Android Studio
npx cap open ios      # Xcode
```

#### Android — Gerar APK
1. `npx cap open android` → abre Android Studio
2. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. APK em: `android/app/build/outputs/apk/debug/app-debug.apk`

#### iOS — Gerar .ipa
1. `npx cap open ios` → abre Xcode
2. **Product** → **Archive** → **Distribute App**
3. Requer assinatura com Apple Developer Program

---

## 📱 PWA (Progressive Web App)

O LumePDF já é **PWA-ready**:

- ✅ `manifest.json` configurado
- ✅ Service Worker (`sw.js`) para cache offline
- ✅ Ícones 192x192 e 512x512
- ✅ Meta tags Apple/Android
- ✅ Instalável na home screen (Chrome/Edge/Safari)

**Como instalar no celular:**
1. Abra no Chrome (Android) ou Safari (iOS)
2. Menu → "Instalar app" / "Adicionar à tela de início"
3. Funciona **offline** após primeira visita!

---

## 🏗️ Arquitetura

```
lumepdf/
├── index.html              # Home + navegação
├── *.html                  # 16 páginas de ferramentas
├── css/estilo.css          # Estilos (Adobe-inspired, mobile-first)
├── js/
│   ├── comum.js            # Header/footer compartilhados + abas
│   ├── ferramenta.js       # Motor genérico + 16 ferramentas (pdf-lib, pdf.js, etc.)
│   └── organizar.js        # Organizador visual de páginas
├── desktop/
│   ├── main.js             # Electron main process
│   ├── icon.ico            # Ícone Windows
│   └── icon-gerar.ps1      # Gerador de ícone
├── capacitor.config.ts     # Config Capacitor (iOS/Android)
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (offline)
├── mobile-build.ps1        # Script build mobile automatizado
├── gerar-icones-pwa.ps1    # Gerador ícones PWA
└── package.json
```

**Tecnologias:**
- **PDF**: `pdf-lib` (criação/edição), `pdf.js` (leitura/render)
- **Office**: `docx` (Word), `xlsx` (Excel), `pptxgenjs` (PowerPoint), `JSZip`
- **Desktop**: Electron 33
- **Mobile**: Capacitor 6
- **PWA**: Service Worker + Web App Manifest

---

## 🔒 Privacidade & Segurança

- **Zero upload**: Todos os arquivos processados localmente no seu dispositivo
- **Zero servidor**: Não há backend, banco de dados ou telemetria
- **Zero cadastro**: Abre e usa — sem conta, sem email, sem rastreamento
- **Código aberto**: Audite você mesmo em `js/ferramenta.js`

---

## 📦 Build Offline (CDN)

As bibliotecas vêm de CDN (jsDelivr). Para uso 100% offline:

```bash
# Baixa todas as libs para vendor/
npm run vendor  # (configure no package.json se precisar)
```

Ou use o **Electron desktop** — já empacota tudo no `.asar`.

---

## 🛠️ Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm start` | Roda Electron (desktop) |
| `npm run dist` | Build instalador Windows (.exe) |
| `npm run serve` | Servidor local (http-server) porta 8086 |
| `npm run mobile:init` | Inicializa Capacitor |
| `npm run mobile:add:android` | Adiciona plataforma Android |
| `npm run mobile:add:ios` | Adiciona plataforma iOS |
| `npm run mobile:sync` | Sincroniza web → nativo |
| `npm run mobile:open:android` | Abre Android Studio |
| `npm run mobile:open:ios` | Abre Xcode |
| `npm run mobile:build:android` | Build Android (requer Android Studio) |
| `npm run mobile:build:ios` | Build iOS (requer Xcode) |
| `npm run mobile:run:android` | Roda no device/emulador Android |
| `npm run mobile:run:ios` | Roda no device/simulador iOS |

---

## 🐛 Problemas Conhecidos

| Problema | Solução |
|----------|---------|
| PDF protegido por senha | Remova a senha antes (ferramentas online ou `qpdf`) |
| Fontes não carregam offline | Use versão Electron ou baixe libs localmente |
| iOS build falha no Windows | Use Mac cloud (GitHub Actions, Codemagic, MacStadium) |
| `docx` CDN 404 | Usa `build/index.umd.js` (configurado em `ferramenta.js`) |
| Organizador miniaturas falham | `var pag` adicionado no strict mode (corrigido) |

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie branch: `git checkout -b feature/nova-ferramenta`
3. Commit: `git commit -m 'feat: adiciona ferramenta X'`
4. Push: `git push origin feature/nova-ferramenta`
5. Abra Pull Request

---

## 📄 Licença

MIT — Use livremente, inclusive comercialmente.  
Veja [LICENSE](LICENSE) para detalhes.

---

## 🙏 Créditos

- **pdf-lib** — Criação/edição PDF client-side
- **pdf.js** — Renderização PDF no navegador
- **docx** — Geração Word (.docx)
- **xlsx** — Planilhas Excel (.xlsx)
- **pptxgenjs** — PowerPoint (.pptx)
- **JSZip** — Leitura/escrita ZIP (Office)
- **Electron** — Desktop app
- **Capacitor** — Mobile app (iOS/Android)
- **Source Sans 3 / Source Serif 4** — Tipografia (Adobe Fonts)

---

**Feito com ☕ por Anthony / LumePDF**  
*Ferramentas PDF que iluminam o seu trabalho.*