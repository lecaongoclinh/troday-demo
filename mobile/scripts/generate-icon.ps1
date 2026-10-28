$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../assets'
[System.IO.Directory]::CreateDirectory($iconDirectory) | Out-Null
$bitmap = New-Object System.Drawing.Bitmap(1024, 1024)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#145C50'))
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$lime = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#D9EEA1'))
$roof = [System.Drawing.PointF[]]@((New-Object System.Drawing.PointF(226, 468)), (New-Object System.Drawing.PointF(512, 227)), (New-Object System.Drawing.PointF(798, 468)))
$graphics.FillPolygon($white, $roof)
$graphics.FillRectangle($white, 291, 438, 442, 349)
$graphics.FillRectangle($lime, 442, 558, 140, 229)
$graphics.FillEllipse($lime, 679, 193, 75, 75)
$bitmap.Save((Join-Path $iconDirectory 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$white.Dispose()
$lime.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
