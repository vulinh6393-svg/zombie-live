<#
.SYNOPSIS
  Dừng an toàn toàn bộ tiến trình của bản Demo LIVE (Game Server, Live Bridge, Client Preview).
#>

$ErrorActionPreference = "SilentlyContinue"
$RootPath = Resolve-Path "$PSScriptRoot\.."
$demoPidFile = Join-Path $RootPath ".demo_pids.json"

if (-not (Test-Path $demoPidFile)) {
  Write-Host "[INFO] Không tìm thấy file PID .demo_pids.json. Quét các tiến trình node đang chạy cổng 3001/5173..." -ForegroundColor Yellow
} else {
  $pids = Get-Content -Path $demoPidFile | ConvertFrom-Json
  if ($pids.serverPid) {
    Write-Host "[STOP] Dừng Game Server (PID $($pids.serverPid))..." -ForegroundColor Yellow
    Stop-Process -Id $pids.serverPid -Force -ErrorAction SilentlyContinue
  }
  if ($pids.bridgePid) {
    Write-Host "[STOP] Dừng Live Bridge (PID $($pids.bridgePid))..." -ForegroundColor Yellow
    Stop-Process -Id $pids.bridgePid -Force -ErrorAction SilentlyContinue
  }
  if ($pids.clientPid) {
    Write-Host "[STOP] Dừng Game Client (PID $($pids.clientPid))..." -ForegroundColor Yellow
    Stop-Process -Id $pids.clientPid -Force -ErrorAction SilentlyContinue
  }
  Remove-Item -Path $demoPidFile -Force -ErrorAction SilentlyContinue
}

Write-Host "[OK] Toàn bộ hệ thống Demo LIVE đã được dừng an toàn." -ForegroundColor Green
