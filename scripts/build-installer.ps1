# Builds the Windows NSIS installer when Rust/cargo is available.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Checking cargo..."
cargo --version
if ($LASTEXITCODE -ne 0) {
  Write-Host @"
cargo is blocked or missing.
On Windows 11 with Smart App Control, allow cargo.exe from:
  $env:USERPROFILE\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin\cargo.exe
Then re-run this script.
"@
  exit 1
}

npm run tauri:build
Write-Host "Installer should be under src-tauri\target\release\bundle\nsis\"
Get-ChildItem "src-tauri\target\release\bundle\nsis\*.exe" -ErrorAction SilentlyContinue
