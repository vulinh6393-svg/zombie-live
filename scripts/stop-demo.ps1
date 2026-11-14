<#
.SYNOPSIS
  Dừng an toàn và triệt để toàn bộ tiến trình của bản Demo LIVE (Game Server, Live Bridge, Client Preview).
  Sử dụng taskkill /T để dừng toàn bộ cây tiến trình (process tree) tránh sót tiến trình node ngầm.
#>

$ErrorActionPreference = "SilentlyContinue"
$RootPath = Resolve-Path "$PSScriptRoot\.."
$demoPidFile = Join-Path $RootPath ".demo_pids.json"

function Kill-ProcessTree {
  param([int]$pidToKill, [string]$label)
  if ($pidToKill -gt 0) {
    Write-Host "[STOP] Dừng $label (PID $pidToKill và tiến trình con)..." -ForegroundColor Yellow
    & taskkill /PID $pidToKill /T /F 2>$null | Out-Null
    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
  }
}

if (-not (Test-Path $demoPidFile)) {
  Write-Host "[INFO] Không tìm thấy file PID .demo_pids.json. Quét các tiến trình node đang chiếm cổng 3001 và 5174..." -ForegroundColor Yellow
  $ports = @(3001, 5174)
  foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
      if ($conn.OwningProcess -gt 0) {
        Kill-ProcessTree $conn.OwningProcess "tiến trình trên port $port"
      }
    }
  }
} else {
  $pids = Get-Content -Path $demoPidFile | ConvertFrom-Json
  if ($pids.serverPid) { Kill-ProcessTree $pids.serverPid "Game Server" }
  if ($pids.bridgePid) { Kill-ProcessTree $pids.bridgePid "Live Bridge" }
  if ($pids.clientPid) { Kill-ProcessTree $pids.clientPid "Game Client" }
  Remove-Item -Path $demoPidFile -Force -ErrorAction SilentlyContinue
}

Write-Host "[OK] Toàn bộ hệ thống Demo LIVE đã được dừng sạch sẽ." -ForegroundColor Green
