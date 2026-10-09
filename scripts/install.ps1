# Architecture Canvas — one-line Windows install from GitHub Releases
# Usage:
#   irm https://raw.githubusercontent.com/tsoncho/architecture-canvas/master/scripts/install.ps1 | iex

$ErrorActionPreference = "Stop"
$repo = "tsoncho/architecture-canvas"

Write-Host ""
Write-Host "  Architecture Canvas" -ForegroundColor Cyan
Write-Host "  Fetching latest Windows installer from GitHub..." -ForegroundColor DarkGray
Write-Host ""

$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers @{
  "User-Agent" = "architecture-canvas-installer"
  "Accept"     = "application/vnd.github+json"
}

$asset = $release.assets |
  Where-Object { $_.name -match '(?i)setup\.exe$' -and $_.name -notmatch '\.sig$' } |
  Select-Object -First 1

if (-not $asset) {
  throw "No setup.exe found on the latest release ($($release.tag_name))."
}

$tempDir = Join-Path $env:TEMP "architecture-canvas-install"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
$installer = Join-Path $tempDir $asset.name

Write-Host "  Release : $($release.tag_name)" -ForegroundColor DarkGray
Write-Host "  File    : $($asset.name)" -ForegroundColor DarkGray
Write-Host "  Download: $($asset.browser_download_url)" -ForegroundColor DarkGray
Write-Host ""

Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installer -UseBasicParsing

Write-Host "  Starting installer..." -ForegroundColor Cyan
Start-Process -FilePath $installer -Wait

Write-Host ""
Write-Host "  Done. Open Architecture Canvas from the Start menu." -ForegroundColor Green
Write-Host "  Updates install automatically from GitHub Releases." -ForegroundColor DarkGray
Write-Host ""
