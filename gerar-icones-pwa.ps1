<# 
.SYNOPSIS
    Gera ícones PWA (192x192 e 512x512) para LumePDF a partir do SVG da marca.

.NOTES
    Requer .NET System.Drawing (disponível no Windows PowerShell 5.1+)
    Gera: icon-192.png, icon-512.png na raiz do projeto
#>

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Drawing.Common 2>$null

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$outputDir = $scriptDir

# Cores LumePDF
$azul = [System.Drawing.Color]::FromArgb(37, 99, 235)  # #2563eb
$branco = [System.Drawing.Color]::White

function DesenharGlifo($graphics, $tamanho, $centroX, $centroY, $raioGlifo) {
    # Desenha o glifo da marca LumePDF (losango com seta)
    # Path: M13 2 L6 13h4.5L10 22l7.5-11.5H13L13 2z
    # Normalizado para viewBox 0 0 24 24
    $pontos = @(
        @(13, 2),
        @(6, 13),
        @(10.5, 13),  # 6 + 4.5
        @(10, 22),
        @(17.5, 10.5), # 10 + 7.5, 22 - 11.5
        @(13, 10.5),
        @(13, 2)
    )

    # Escala para o tamanho do canvas
    $escala = $tamanho / 24.0
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    
    $primeiro = $true
    foreach ($p in $pontos) {
        $x = $centroX + ($p[0] - 12) * $escala * $raioGlifo * 2
        $y = $centroY + ($p[1] - 12) * $escala * $raioGlifo * 2
        if ($primeiro) {
            $path.StartFigure()
            $path.AddLine($centroX, $centroY, $x, $y)
            $primeiro = $false
        } else {
            $path.AddLine($x, $y)
        }
    }
    $path.CloseFigure()
    
    $brush = New-Object System.Drawing.SolidBrush($branco)
    $graphics.FillPath($brush, $path)
    $brush.Dispose()
    $path.Dispose()
}

function GerarIcone($tamanho, $nomeArquivo) {
    $bmp = New-Object System.Drawing.Bitmap($tamanho, $tamanho, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Qualidade máxima
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    
    # Fundo azul com cantos arredondados
    $raioCantos = [math]::Round($tamanho * 0.18)  # 18% do tamanho
    $retangulo = New-Object System.Drawing.Rectangle(0, 0, $tamanho, $tamanho)
    
    $pathFundo = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $raioCantos * 2
    $pathFundo.AddArc($retangulo.X, $retangulo.Y, $d, $d, 180, 90)
    $pathFundo.AddArc($retangulo.Right - $d, $retangulo.Y, $d, $d, 270, 90)
    $pathFundo.AddArc($retangulo.Right - $d, $retangulo.Bottom - $d, $d, $d, 0, 90)
    $pathFundo.AddArc($retangulo.X, $retangulo.Bottom - $d, $d, $d, 90, 90)
    $pathFundo.CloseFigure()
    
    $brushFundo = New-Object System.Drawing.SolidBrush($azul)
    $g.FillPath($brushFundo, $pathFundo)
    $brushFundo.Dispose()
    $pathFundo.Dispose()
    
    # Desenha glifo branco centralizado
    DesenharGlifo $g $tamanho ($tamanho/2) ($tamanho/2) 0.45
    
    # Salva
    $bmp.Save($nomeArquivo, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
    
    Write-Host "✅ Gerado: $nomeArquivo ($tamanho x $tamanho)"
}

# Gerar ícones PWA
GerarIcone 192 "$outputDir\icon-192.png"
GerarIcone 512 "$outputDir\icon-512.png"

Write-Host "`n🎉 Ícones PWA gerados com sucesso!"
Write-Host "   - icon-192.png (192x192)"
Write-Host "   - icon-512.png (512x512)"