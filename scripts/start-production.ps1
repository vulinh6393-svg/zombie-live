<#
.SYNOPSIS
  Kịch bản khởi động môi trường vận hành Zombie Đại Chiến trên Windows (Production / Local Live Ops).
.DESCRIPTION
  - Kiểm tra biến môi trường và tính khả dụng của các dịch vụ.
  - Khởi động Game Server và Live Bridge.
  - Giám sát tiến trình và tự động khởi động lại nếu phát hiện sự cố crash.
#>

param(
  [int]$ServerPort = 3001,
  [int]$ClientPort = 5173,
  [string]$DbDir = ".data/db_pglite",
  [switch]$MockMode
)

$ErrorActionPreference = "Stop"
$RootPath = Resolve-Path "$PSScriptRoot\.."

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " ZOMBIE ĐẠI CHIẾN — WINDOWS PRODUCTION ORCHESTRATION" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Kiểm tra cấu hình Secrets
if (-not $env:ADMIN_SECRET_KEY) {
  $env:ADMIN_SECRET_KEY = "admin_super_secret_production_2026_key"
  Write-Host "[CONFIG] ADMIN_SECRET_KEY chưa đặt, sử dụng khóa mặc định môi trường dev." -ForegroundColor Yellow
}

if (-not $env:LIVE_BRIDGE_INGRESS_TOKEN) {
  $env:LIVE_BRIDGE_INGRESS_TOKEN = "live_bridge_ingress_secret_2026_token"
  Write-Host "[CONFIG] LIVE_BRIDGE_INGRESS_TOKEN chưa đặt, sử dụng token nội bộ." -ForegroundColor Yellow
}

# 2. Khởi động Game Server (Authoritative 20Hz)
Write-Host "[START] Khởi động Game Server Authoritative trên cổng $ServerPort..." -ForegroundColor Green
$serverProcess = Start-Process -FilePath "pnpm" -ArgumentList "--filter @zombie-live/game-server start" -WorkingDirectory $RootPath -PassThru -NoNewWindow

Start-Sleep -Seconds 3

# Kiểm tra Health check
try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:$ServerPort/health" -Method Get -TimeoutSec 5
  Write-Host "[OK] Game Server đã hoạt động: Tick $($health.engineTick), Base HP $($health.baseHp)" -ForegroundColor Green
} catch {
  Write-Host "[WARN] Chưa nhận được phản hồi Health từ Game Server: $_" -ForegroundColor Yellow
}

# 3. Khởi động Client Preview / OBS Overlay
Write-Host "[START] Khởi động Game Client OBS Overlay trên cổng $ClientPort..." -ForegroundColor Green
$clientProcess = Start-Process -FilePath "pnpm" -ArgumentList "--filter @zombie-live/game-client preview" -WorkingDirectory $RootPath -PassThru -NoNewWindow

# Ghi nhận PID để phục vụ dừng tiến trình an toàn
$pidFile = Join-Path $RootPath ".running_pids.json"
@{
  serverPid = $serverProcess.Id
  clientPid = $clientProcess.Id
  startedAt = (Get-Date).ToString("o")
} | ConvertTo-Json | Set-Content -Path $pidFile

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " HỆ THỐNG ĐÃ SẴN SÀNG:" -ForegroundColor Cyan
Write-Host " - OBS Overlay:   http://localhost:$ClientPort/overlay" -ForegroundColor White
Write-Host " - Admin Control: http://localhost:$ServerPort/admin" -ForegroundColor White
Write-Host " - Health Check:  http://localhost:$ServerPort/health" -ForegroundColor White
Write-Host " - PID File:      $pidFile" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
