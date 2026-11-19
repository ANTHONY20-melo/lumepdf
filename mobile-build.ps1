<# 
.SYNOPSIS
    Script completo para build mobile do LumePDF (Android APK / iOS)
    Usa Capacitor para gerar apps nativos a partir da web app.

.DESCRIPTION
    Este script:
    1. Instala dependências (npm install)
    2. Inicializa Capacitor (se primeira vez)
    3. Adiciona plataformas Android/iOS
    4. Sincroniza arquivos web -> nativo
    5. Abre no Android Studio / Xcode para build final

.REQUIREMENTS
    - Node.js 18+ 
    - Android Studio (para Android)
    - Xcode (para iOS - apenas macOS)
    - JDK 17+ (para Android)

.EXAMPLE
    .\mobile-build.ps1 -Platform android
    .\mobile-build.ps1 -Platform ios
    .\mobile-build.ps1 -Platform all -OpenIDE
#>

param(
    [ValidateSet('android', 'ios', 'all')]
    [string]$Platform = 'android',
    
    [switch]$Init,
    [switch]$OpenIDE,
    [switch]$SkipInstall,
    [switch]$Clean
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  LumePDF - Mobile Build Script (Capacitor)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Error "❌ Node.js não encontrado. Instale em https://nodejs.org/"
    exit 1
}
Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green

# Verifica npm
$npmVersion = npm --version 2>$null
Write-Host "✅ npm: $npmVersion" -ForegroundColor Green

# Limpa se solicitado
if ($Clean) {
    Write-Host "`n🧹 Limpando builds anteriores..." -ForegroundColor Yellow
    if (Test-Path "android") { Remove-Item -Recurse -Force "android" -ErrorAction SilentlyContinue }
    if (Test-Path "ios") { Remove-Item -Recurse -Force "ios" -ErrorAction SilentlyContinue }
    if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue }
    if (Test-Path "package-lock.json") { Remove-Item "package-lock.json" -ErrorAction SilentlyContinue }
    Write-Host "✅ Limpeza concluída" -ForegroundColor Green
}

# Instala dependências
if (-not $SkipInstall) {
    Write-Host "`n📦 Instalando dependências npm..." -ForegroundColor Yellow
    try {
        npm install
        Write-Host "✅ Dependências instaladas" -ForegroundColor Green
    } catch {
        Write-Error "❌ Falha ao instalar dependências"
        exit 1
    }
}

# Verifica/instala Capacitor CLI
$capVersion = npx cap --version 2>$null
if (-not $capVersion) {
    Write-Host "`n⚡ Instalando Capacitor CLI..." -ForegroundColor Yellow
    npm install -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios
}

# Inicializa Capacitor se necessário
$capConfig = "capacitor.config.ts"
if ($Init -or -not (Test-Path $capConfig)) {
    Write-Host "`n🔧 Inicializando Capacitor..." -ForegroundColor Yellow
    npx cap init "LumePDF" "com.anthotec.lumepdf" --web-dir=.
    Write-Host "✅ Capacitor inicializado" -ForegroundColor Green
}

function Build-Android {
    Write-Host "`n🤖 ===== BUILD ANDROID =====" -ForegroundColor Cyan
    
    # Adiciona plataforma Android se não existe
    if (-not (Test-Path "android")) {
        Write-Host "📱 Adicionando plataforma Android..." -ForegroundColor Yellow
        npx cap add android
    }
    
    # Sincroniza web -> native
    Write-Host "🔄 Sincronizando arquivos web para Android..." -ForegroundColor Yellow
    npx cap sync android
    
    # Copia ícones para Android (se existirem)
    if (Test-Path "icon-512.png") {
        Write-Host "🎨 Atualizando ícones Android..." -ForegroundColor Yellow
        $androidRes = "android\app\src\main\res"
        $sizes = @{ "mipmap-mdpi"=48; "mipmap-hdpi"=72; "mipmap-xhdpi"=96; "mipmap-xxhdpi"=144; "mipmap-xxxhdpi"=192 }
        foreach ($folder in $sizes.Keys) {
            $size = $sizes[$folder]
            $destDir = "$androidRes\$folder"
            if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }
            # Usa magick se disponível, senão copia o 512px redimensionado via script
            if (Get-Command magick -ErrorAction SilentlyContinue) {
                magick convert "icon-512.png" -resize "${size}x${size}" "$destDir\ic_launcher.png"
                magick convert "icon-512.png" -resize "${size}x${size}" "$destDir\ic_launcher_round.png"
            }
        }
    }
    
    Write-Host "`n✅ Build Android preparado!" -ForegroundColor Green
    Write-Host "`n📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Abra no Android Studio: npx cap open android" -ForegroundColor White
    Write-Host "   2. Build > Build Bundle(s) / APK(s) > Build APK(s)" -ForegroundColor White
    Write-Host "   3. APK gerado em: android/app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor White
    
    if ($OpenIDE) {
        Write-Host "`n🚀 Abrindo Android Studio..." -ForegroundColor Yellow
        npx cap open android
    }
}

function Build-iOS {
    Write-Host "`n🍎 ===== BUILD iOS =====" -ForegroundColor Cyan
    
    if ($IsMacOS -eq $false) {
        Write-Warning "⚠️  Build iOS requer macOS com Xcode instalado."
        Write-Host "   No Windows/Linux: use GitHub Actions, Codemagic ou Mac cloud (MacStadium, etc.)" -ForegroundColor Gray
        return
    }
    
    # Adiciona plataforma iOS se não existe
    if (-not (Test-Path "ios")) {
        Write-Host "📱 Adicionando plataforma iOS..." -ForegroundColor Yellow
        npx cap add ios
    }
    
    # Sincroniza web -> native
    Write-Host "🔄 Sincronizando arquivos web para iOS..." -ForegroundColor Yellow
    npx cap sync ios
    
    # Copia ícones para iOS (Assets.xcassets)
    if (Test-Path "icon-1024.png") {
        Write-Host "🎨 Atualizando ícones iOS..." -ForegroundColor Yellow
        # iOS usa Assets.xcassets com múltiplos tamanhos
        # Requer script separado ou Xcode manual
    }
    
    Write-Host "`n✅ Build iOS preparado!" -ForegroundColor Green
    Write-Host "`n📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Abra no Xcode: npx cap open ios" -ForegroundColor White
    Write-Host "   2. Product > Archive > Distribute App" -ForegroundColor White
    Write-Host "   3. Requer Apple Developer Program ($99/ano)" -ForegroundColor White
    
    if ($OpenIDE) {
        Write-Host "`n🚀 Abrindo Xcode..." -ForegroundColor Yellow
        npx cap open ios
    }
}

# Executa builds solicitados
switch ($Platform) {
    'android' { Build-Android }
    'ios'     { Build-iOS }
    'all'     { Build-Android; Build-iOS }
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  ✅ Build mobile concluído!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan