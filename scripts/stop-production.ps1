<#
.SYNOPSIS
  Dừng an toàn các tiến trình Zombie Đại Chiến theo PID lưu trong file.
#>

$ErrorActionPreference = "SilentlyContinue"
$RootPath = Resolve-Path "$PSScriptRoot\.."
$pidFile = Join-Path $RootPath ".running_pids.json"

if (-not (Test-Path $pidFile)) {
  Write-Host "[INFO] Không tìm thấy file PID ($pidFile). Không có tiến trình nào đang lưu vết." -ForegroundColor Yellow
  exit 0
}

try {
  $data = Get-Content $pidFile | ConvertFrom-Json
  if ($data.serverPid) {
    Write-Host "[STOP] Dừng Game Server (PID: $($data.serverPid))..." -ForegroundColor Yellow
    Stop-Process -Id $data.serverPid -Force
  }
  if ($data.clientPid) {
    Write-Host "[STOP] Dừng Game Client (PID: $($data.clientPid))..." -ForegroundColor Yellow
    Stop-Process -Id $data.clientPid -Force
  }
  Remove-Item -Path $pidFile -Force
  Write-Host "[OK] Đã dừng toàn bộ dịch vụ và xóa file PID." -ForegroundColor Green
} catch {
  Write-Host "[WARN] Lỗi khi dừng tiến trình: $_" -ForegroundColor Red
}
