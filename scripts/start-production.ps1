<#
.SYNOPSIS
  Kịch bản khởi động môi trường PRODUCTION Zombie Đại Chiến trên Windows.
.DESCRIPTION
  - Kiểm tra bắt buộc biến môi trường bảo mật (Fail-Closed nếu thiếu secrets).
  - Khởi động Game Server (Authoritative 20Hz) và Client.
  - Quản lý PID chính xác theo process ownership.
#>

param(
  [int]$ServerPort = 3001,
  [int]$ClientPort = 5173,
  [string]$DbDir = ".data/pglite"
)

$ErrorActionPreference = "Stop"
$RootPath = Resolve-Path "$PSScriptRoot\.."

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " ZOMBIE ĐẠI CHIẾN — WINDOWS PRODUCTION STARTUP" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Kiểm tra nghiêm ngặt biến môi trường bảo mật (Fail-Closed)
$InsecureDefaults = @(
  "admin_super_secret_production_2026_key",
  "live_bridge_ingress_secret_2026_token",
  "operator_secret_production_2026",
  "viewer_secret_production_2026"
)

if (-not $env:ADMIN_SECRET_KEY -or $env:ADMIN_SECRET_KEY.Length -lt 16 -or $InsecureDefaults -contains $env:ADMIN_SECRET_KEY) {
  Write-Host "[FATAL SECURITY ERROR] ADMIN_SECRET_KEY bắt buộc phải được cấu hình (tối thiểu 16 ký tự, không dùng default)." -ForegroundColor Red
  exit 1
}

if (-not $env:LIVE_BRIDGE_INGRESS_TOKEN -or $env:LIVE_BRIDGE_INGRESS_TOKEN.Length -lt 16 -or $InsecureDefaults -contains $env:LIVE_BRIDGE_INGRESS_TOKEN) {
  Write-Host "[FATAL SECURITY ERROR] LIVE_BRIDGE_INGRESS_TOKEN bắt buộc phải được cấu hình (tối thiểu 16 ký tự, không dùng default)." -ForegroundColor Red
  exit 1
}

Write-Host "[CONFIG] Đã xác minh secrets production hợp lệ." -ForegroundColor Green

# 2. Khởi động Game Server
Write-Host "[START] Khởi động Game Server Authoritative trên cổng $ServerPort..." -ForegroundColor Green
$serverProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm --filter @zombie-live/game-server start" -WorkingDirectory $RootPath -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 3

# Kiểm tra Health check
try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:$ServerPort/health" -Method Get -TimeoutSec 5
  Write-Host "[OK] Game Server đã hoạt động: Tick $($health.engineTick), Base HP $($health.baseHp)" -ForegroundColor Green
} catch {
  Write-Host "[WARN] Game Server đang khởi tạo hoặc chưa phản hồi: $_" -ForegroundColor Yellow
}

# 3. Khởi động Client
Write-Host "[START] Khởi động Game Client trên cổng $ClientPort..." -ForegroundColor Green
$clientProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm --filter @zombie-live/game-client preview -- --port $ClientPort --host" -WorkingDirectory $RootPath -PassThru -WindowStyle Hidden

$pidFile = Join-Path $RootPath ".production_pids.json"
@{
  serverPid = $serverProcess.Id
  clientPid = $clientProcess.Id
  startedAt = (Get-Date).ToString("o")
} | ConvertTo-Json | Set-Content -Path $pidFile

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " HỆ THỐNG PRODUCTION ĐÃ KHỞI CHẠY:" -ForegroundColor Cyan
Write-Host " - OBS Overlay:   http://localhost:$ClientPort/overlay" -ForegroundColor White
Write-Host " - Admin Control: http://localhost:$ServerPort/admin" -ForegroundColor White
Write-Host " - Health Check:  http://localhost:$ServerPort/health" -ForegroundColor White
Write-Host " - PID File:      $pidFile" -ForegroundColor White
Write-Host " (Lưu ý: Để dừng tiến trình an toàn, chạy .\scripts\stop-production.ps1)" -ForegroundColor DarkGray
Write-Host "================================================================" -ForegroundColor Cyan
