# LUMEPDF — gerar icon.ico (quadrado azul arredondado + raio branco)
# System.Drawing + empacotamento ICO com entradas PNG comprimidas.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$saida = Join-Path $PSScriptRoot "icon.ico"
$tamanhos = @(256, 128, 64, 48, 32, 16)
$azul = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)
$branco = [System.Drawing.Color]::White
$frames = @()

foreach ($lado in $tamanhos) {
    $bmp = [System.Drawing.Bitmap]::new($lado, $lado)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    $corAzul = [System.Drawing.SolidBrush]::new($azul)
    $raio = [double] $lado * 0.18
    $caminho = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $caminho.AddArc($lado - $raio * 2, 0, $raio * 2, $raio * 2, 270, 90)
    $caminho.AddArc($lado - $raio * 2, $lado - $raio * 2, $raio * 2, $raio * 2, 0, 90)
    $caminho.AddArc(0, $lado - $raio * 2, $raio * 2, $raio * 2, 90, 90)
    $caminho.AddArc(0, 0, $raio * 2, $raio * 2, 180, 90)
    $caminho.CloseFigure()
    $g.FillPath($corAzul, $caminho)

    # raio: mesma geometria do SVG da marca (viewBox 0..24)
    $p = $lado / 24.0
    $pts = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new((13.0 * $p), (2.0 * $p)),
        [System.Drawing.PointF]::new((6.0 * $p), (10.0 * $p)),
        [System.Drawing.PointF]::new((10.5 * $p), (10.0 * $p)),
        [System.Drawing.PointF]::new((10.0 * $p), (22.0 * $p)),
        [System.Drawing.PointF]::new((17.5 * $p), (11.0 * $p)),
        [System.Drawing.PointF]::new((13.0 * $p), (11.0 * $p))
    )
    $pena = [System.Drawing.SolidBrush]::new($branco)
    $g.FillPolygon($pena, $pts)

    $g.Dispose()
    $corAzul.Dispose()
    $pena.Dispose()
    $caminho.Dispose()

    $ms = [System.IO.MemoryStream]::new()
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    [byte[]] $bytesFrame = $ms.ToArray()
    $ms.Dispose()
    $frames += @{ lado = $lado; bytes = $bytesFrame }
    Write-Host ("frame {0}px: {1} bytes" -f $lado, $bytesFrame.Length)
}

# --- empacota ICO ---
$ms2 = [System.IO.MemoryStream]::new()
$bw = [System.IO.BinaryWriter]::new($ms2)
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$frames.Count)
$deslocamento = 6 + 16 * $frames.Count
foreach ($f in $frames) {
    $lado = $f.lado
    $byte_ = [Byte]$(if ($lado -ge 256) { 0 } else { $lado })
    $bw.Write($byte_)
    $bw.Write($byte_)
    $bw.Write([Byte]0)
    $bw.Write([Byte]0)
    $bw.Write([UInt16]1)
    $bw.Write([UInt16]32)
    $bw.Write([UInt32]$f.bytes.Length)
    $bw.Write([UInt32]$deslocamento)
    $deslocamento += $f.bytes.Length
}
foreach ($f in $frames) { [byte[]] $b2 = $f.bytes; $bw.Write($b2) }
$bw.Flush()
[System.IO.File]::WriteAllBytes($saida, $ms2.ToArray())
$bw.Dispose()
$ms2.Dispose()
Write-Host ("ICONE OK -> {0} ({1} KB)" -f $saida, [Math]::Round((Get-Item $saida).Length / 1KB))
