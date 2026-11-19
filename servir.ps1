# LUMEPDF — Servir
# Abre o site localmente. Como todo o processamento e client-side,
# basta abrir o index.html, mas o servidor deixa a navegacao mais limpa.

param(
    [int]$Porta = 8086
)

$raiz = $PSScriptRoot
if (-not $raiz) { $raiz = Split-Path -Parent $MyInvocation.MyCommand.Path }

Write-Host ""
Write-Host "  L U M E P D F  -  estudio de PDF local" -ForegroundColor Red
Write-Host "  -----------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Pasta: $raiz" -ForegroundColor Gray

$url = "http://localhost:$Porta/index.html"

# 1) Python disponivel? servidor HTTP completo
$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
    Write-Host "  Servidor: python http.server na porta $Porta" -ForegroundColor Gray
    Write-Host "  Abrindo: $url" -ForegroundColor Green
    Write-Host ""
    Start-Process $url
    Set-Location -LiteralPath $raiz
    python -m http.server $Porta
    return
}

# 2) Sem Python: abre direto pelo arquivo (funciona por ser client-side)
Write-Host "  Python nao encontrado - abrindo arquivo direto (funciona igual)" -ForegroundColor Yellow
Start-Process (Join-Path $raiz "index.html")
