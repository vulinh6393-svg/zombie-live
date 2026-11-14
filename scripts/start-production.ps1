<#
.SYNOPSIS
  Kịch bản khởi động môi trường PRODUCTION Zombie Đại Chiến trên Windows (P1.2).
.DESCRIPTION
  - Bắt buộc NODE_ENV=production.
  - Bắt buộc DATABASE_URL trỏ tới PostgreSQL Server thật (nghiêm cấm PGlite trong production).
  - Kiểm tra bắt buộc biến môi trường bảo mật (Fail-Closed nếu dùng default secrets).
  - Kiểm tra endpoint /ready (Fail-closed nếu trả về 503).
  - Mặc định bind 127.0.0.1.
  - Nêu rõ không có auto-restart supervisor ngầm (yêu cầu quản lý qua Docker/PM2/systemd nếu muốn 24/7).
#>

param(
  [int]$ServerPort = 3001,
  [int]$ClientPort = 5173,
  [string]$BindHost = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$RootPath = (Resolve-Path "$PSScriptRoot\..").Path

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " ZOMBIE ĐẠI CHIẾN — WINDOWS PRODUCTION STARTUP (P1.2)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Bắt buộc NODE_ENV=production
$env:NODE_ENV = "production"
$env:HOST = $BindHost

# 2. Bắt buộc có DATABASE_URL trỏ tới PostgreSQL server thật (Không PGlite fallback)
if (-not $env:DATABASE_URL -or (-not ($env:DATABASE_URL.StartsWith("postgresql://") -or $env:DATABASE_URL.StartsWith("postgres://")))) {
  Write-Host "[FATAL CONFIG ERROR] DATABASE_URL bắt buộc phải được cấu hình và là chuỗi kết nối PostgreSQL thật (postgresql://user:pass@host:5432/db)." -ForegroundColor Red
  Write-Host "[FATAL CONFIG ERROR] Môi trường PRODUCTION nghiêm cấm sử dụng PGlite embedded để tránh xung đột file đa tiến trình!" -ForegroundColor Red
  exit 1
}

# 3. Kiểm tra nghiêm ngặt biến môi trường bảo mật (Fail-Closed)
$InsecureDefaults = @(
  "admin_super_secret_production_2026_key",
  "live_bridge_ingress_secret_2026_token",
  "operator_secret_production_2026",
  "viewer_secret_production_2026"
)

if (-not $env:ADMIN_SECRET_KEY -or $env:ADMIN_SECRET_KEY.Length -lt 24 -or $InsecureDefaults -contains $env:ADMIN_SECRET_KEY) {
  Write-Host "[FATAL SECURITY ERROR] ADMIN_SECRET_KEY bắt buộc phải được cấu hình (tối thiểu 24 ký tự, cấm sử dụng default)." -ForegroundColor Red
  exit 1
}

if (-not $env:LIVE_BRIDGE_INGRESS_TOKEN -or $env:LIVE_BRIDGE_INGRESS_TOKEN.Length -lt 24 -or $InsecureDefaults -contains $env:LIVE_BRIDGE_INGRESS_TOKEN) {
  Write-Host "[FATAL SECURITY ERROR] LIVE_BRIDGE_INGRESS_TOKEN bắt buộc phải được cấu hình (tối thiểu 24 ký tự, cấm sử dụng default)." -ForegroundColor Red
  exit 1
}

Write-Host "[CONFIG] Đã xác minh secrets và DATABASE_URL production hợp lệ." -ForegroundColor Green

# 4. Kiểm tra build artifacts
$serverDist = Join-Path $RootPath "apps/game-server/dist/index.js"
$clientDist = Join-Path $RootPath "apps/game-client/dist/index.html"
if ((-not (Test-Path $serverDist)) -or (-not (Test-Path $clientDist))) {
  Write-Host "[BUILD] Thiếu artifacts bản dựng. Đang tiến hành pnpm run build..." -ForegroundColor Yellow
  & pnpm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[FATAL] Biên dịch production thất bại!" -ForegroundColor Red
    exit 1
  }
}

# 5. Khởi động Game Server
Write-Host "[START] Khởi động Game Server Authoritative trên $BindHost`:$ServerPort..." -ForegroundColor Green
$serverProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm --filter @zombie-live/game-server start" -WorkingDirectory $RootPath -PassThru -WindowStyle Hidden

# 6. Xác minh /ready fail-closed
Write-Host "[CHECK] Đang xác minh /ready với cơ sở dữ liệu PostgreSQL..." -NoNewline
$isReady = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 800
  try {
    $res = Invoke-RestMethod -Uri "http://$BindHost`:$ServerPort/ready" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($res -and $res.status -eq "ready") {
      $isReady = $true
      break
    }
  } catch {
    # Nếu trả về HTTP 503
    if ($_.Exception.Response.StatusCode.value__ -eq 503) {
      Write-Host "`n[FATAL FAIL-CLOSED] /ready trả về HTTP 503 (DATABASE_UNHEALTHY)!" -ForegroundColor Red
      Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
      exit 1
    }
  }
  Write-Host "." -NoNewline
}

if (-not $isReady) {
  Write-Host "`n[FATAL] Game Server không đạt trạng thái ready sau 24 giây. Huỷ khởi động." -ForegroundColor Red
  Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
  exit 1
}
Write-Host " [READY PASS]" -ForegroundColor Green

# 7. Khởi động Client
Write-Host "[START] Khởi động Game Client trên $BindHost`:$ClientPort..." -ForegroundColor Green
$clientProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm --filter @zombie-live/game-client preview -- --port $ClientPort --host $BindHost" -WorkingDirectory $RootPath -PassThru -WindowStyle Hidden

$pidFile = Join-Path $RootPath ".production_pids.json"
@{
  serverPid = $serverProcess.Id
  clientPid = $clientProcess.Id
  startedAt = (Get-Date).ToString("o")
  databaseUrl = $env:DATABASE_URL.Substring(0, 15) + "..."
  bindHost = $BindHost
} | ConvertTo-Json | Set-Content -Path $pidFile

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " HỆ THỐNG PRODUCTION ĐÃ SẴN SÀNG:" -ForegroundColor Cyan
Write-Host " - Host bind:     $BindHost (Local reverse-proxy ready)" -ForegroundColor White
Write-Host " - OBS Overlay:   http://$BindHost`:$ClientPort/overlay" -ForegroundColor White
Write-Host " - Admin Control: http://$BindHost`:$ServerPort/admin" -ForegroundColor White
Write-Host " - Ready Status:  http://$BindHost`:$ServerPort/ready" -ForegroundColor White
Write-Host " - PID File:      $pidFile" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " [CẢNH BÁO QUẢN TRỊ 24/7] Script này khởi động tiến trình trực tiếp." -ForegroundColor Yellow
Write-Host " Không có auto-restart supervisor ngầm. Để vận hành 24/7 có tự khôi phục khi sự cố," -ForegroundColor Yellow
Write-Host " khuyến nghị chạy qua Docker Compose, PM2, hoặc Windows Service Supervisor." -ForegroundColor Yellow
Write-Host " Để dừng tiến trình an toàn: Chạy .\scripts\stop-production.ps1`n" -ForegroundColor DarkGray
