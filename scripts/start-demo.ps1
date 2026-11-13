<#
.SYNOPSIS
  Kịch bản 1 lệnh chạy TRỌN GÓI Demo LIVE cục bộ: Game Server + Mock Live Bridge (100 Viewers) + Client OBS Overlay.
.DESCRIPTION
  - Khởi động Game Server (Authoritative 20Hz Simulation Loop + PGlite DB).
  - Chờ Game Server sẵn sàng (/health OK).
  - Khởi động Live Bridge Runner tiếp nhận và gửi tương tác từ 100 người xem giả lập.
  - Khởi động Game Client (Phaser 3.90 9:16 Renderer & OBS Overlay).
  - Xuất đường dẫn trực quan cho OBS và Admin Dashboard.
#>

param(
  [int]$ServerPort = 3001,
  [int]$ClientPort = 5173,
  [int]$MockViewers = 100,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$RootPath = Resolve-Path "$PSScriptRoot\.."

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "    ZOMBIE ĐẠI CHIẾN: THÀNH TRÌ CUỐI CÙNG — RUNNABLE LIVE DEMO (PHASE 08.1)     " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# 1. Thiết lập biến môi trường demo cục bộ
$env:NODE_ENV = "development"
$env:PORT = "$ServerPort"
$env:GAME_SERVER_URL = "http://127.0.0.1:$ServerPort"
$env:ADMIN_SECRET_KEY = "admin_super_secret_production_2026_key"
$env:LIVE_BRIDGE_INGRESS_TOKEN = "live_bridge_ingress_secret_2026_token"
$env:PROVIDER_MODE = "mock"
$env:MOCK_VIEWERS = "$MockViewers"

# 2. Khởi chạy Game Server Authoritative
Write-Host "[1/3] Khởi động Game Server (20Hz Engine + PGlite DB) trên cổng $ServerPort..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm --filter @zombie-live/game-server start" -WorkingDirectory $RootPath -PassThru -WindowStyle Hidden

# Chờ Game Server phản hồi /health
Write-Host "[1/3] Đang chờ Game Server sẵn sàng..." -NoNewline
$serverReady = $false
for ($i = 0; $i -lt 25; $i++) {
  Start-Sleep -Milliseconds 800
  try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:$ServerPort/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($res -and $res.status -eq "ok") {
      $serverReady = $true
      break
    }
  } catch {}
  Write-Host "." -NoNewline
}

if (-not $serverReady) {
  Write-Host "`n[FATAL] Game Server không phản hồi sau 20 giây. Kiểm tra log lỗi." -ForegroundColor Red
  Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
  exit 1
}
Write-Host " [SẴN SÀNG!]" -ForegroundColor Green

# 3. Khởi chạy Live Bridge Runner (100 Viewers tương tác liên tục)
Write-Host "[2/3] Khởi động Live Bridge Runner ($MockViewers viewers JOIN, BAN, SUA, CUU, BOSS, GIFT)..." -ForegroundColor Yellow
$bridgeProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm --filter @zombie-live/live-bridge start" -WorkingDirectory $RootPath -PassThru -WindowStyle Hidden

# 4. Khởi chạy Game Client Preview (Vite static server)
Write-Host "[3/3] Khởi động Game Client (OBS Overlay & Phaser Renderer) trên cổng $ClientPort..." -ForegroundColor Yellow
$clientProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm --filter @zombie-live/game-client preview -- --port $ClientPort --host" -WorkingDirectory $RootPath -PassThru -WindowStyle Hidden

# Lưu thông tin PID để tắt sạch sẽ khi cần
$demoPidFile = Join-Path $RootPath ".demo_pids.json"
@{
  serverPid = $serverProcess.Id
  bridgePid = $bridgeProcess.Id
  clientPid = $clientProcess.Id
  startedAt = (Get-Date).ToString("o")
  serverPort = $ServerPort
  clientPort = $ClientPort
} | ConvertTo-Json | Set-Content -Path $demoPidFile

Start-Sleep -Seconds 2

Write-Host "`n================================================================================" -ForegroundColor Green
Write-Host " BẢN DEMO LIVE 100 VIEWERS ĐANG CHẠY THÀNH CÔNG!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host " [OBS Overlay]      http://localhost:$ClientPort/overlay" -ForegroundColor White
Write-Host " [Game Canvas]       http://localhost:$ClientPort/" -ForegroundColor White
Write-Host " [Admin Dashboard]  http://localhost:$ServerPort/admin" -ForegroundColor White
Write-Host " [Health Status]    http://localhost:$ServerPort/health" -ForegroundColor White
Write-Host " [Live Telemetry]   http://localhost:$ServerPort/api/admin/monitoring" -ForegroundColor White
Write-Host "================================================================================" -ForegroundColor Green
Write-Host " * Luồng dữ liệu: Mock 100 Viewers -> Live Bridge -> Ingress Token -> Gift Ledger -> Outbox -> Authoritative Engine (20Hz) -> Phaser Canvas/OBS" -ForegroundColor Cyan
Write-Host " * Để dừng toàn bộ hệ thống demo: Chạy .\scripts\stop-demo.ps1`n" -ForegroundColor DarkGray

if ($OpenBrowser) {
  Start-Process "http://localhost:$ClientPort/overlay"
}
