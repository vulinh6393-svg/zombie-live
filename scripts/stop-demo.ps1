<#
.SYNOPSIS
  Dừng an toàn và có kiểm soát phiên Demo LIVE (Game Server, Live Bridge, Client Preview).
  P1.4 Process Safety: Chỉ dừng các tiến trình được ghi nhận trong .demo_pids.json.
  Tuyệt đối không taskkill tùy tiện các tiến trình khác đang chiếm cổng trên Windows.
#>

$ErrorActionPreference = "SilentlyContinue"
$RootPath = Resolve-Path "$PSScriptRoot\.."
$demoPidFile = Join-Path $RootPath ".demo_pids.json"

function Safe-KillDemoProcess {
  param([int]$pidToKill, [string]$label)
  if ($pidToKill -gt 0) {
    $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
    if ($proc) {
      # Xác nhận tiến trình là node hoặc cmd được khởi tạo cho demo
      if ($proc.ProcessName -match "node|cmd|powershell") {
        Write-Host "[STOP] Dừng $label (PID $pidToKill - $($proc.ProcessName))..." -ForegroundColor Yellow
        & taskkill /PID $pidToKill /T /F 2>$null | Out-Null
        Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
      } else {
        Write-Host "[WARN] PID $pidToKill là '$($proc.ProcessName)', không khớp tiến trình demo. Bỏ qua để bảo vệ an toàn." -ForegroundColor Yellow
      }
    }
  }
}

if (-not (Test-Path $demoPidFile)) {
  Write-Host "[INFO] Không tìm thấy file .demo_pids.json. Không có phiên Demo LIVE nào đang chạy để dừng." -ForegroundColor Yellow
  exit 0
}

$pids = Get-Content -Path $demoPidFile | ConvertFrom-Json
if ($pids.serverPid) { Safe-KillDemoProcess $pids.serverPid "Game Server" }
if ($pids.bridgePid) { Safe-KillDemoProcess $pids.bridgePid "Live Bridge" }
if ($pids.clientPid) { Safe-KillDemoProcess $pids.clientPid "Game Client" }

Remove-Item -Path $demoPidFile -Force -ErrorAction SilentlyContinue
Write-Host "[OK] Phiên Demo LIVE đã được dừng an toàn." -ForegroundColor Green
