<#
.SYNOPSIS
  Kịch bản 1 lệnh chạy TRỌN GÓI Demo LIVE cục bộ với kiểm tra sẵn sàng nghiêm ngặt (P1.1 & P1.2):
  Game Server + Mock Live Bridge (100 Viewers) + Client OBS Overlay.
.DESCRIPTION
  - Kiểm tra trước artifact build (server, bridge, client). Tự động biên dịch nếu thiếu.
  - Khởi động Game Server và xác minh endpoint /ready (DB + 20Hz Engine).
  - Khởi động Live Bridge Runner và xác nhận tiến trình duy trì hoạt động.
  - Khởi động Game Client (Vite static server) và xác nhận HTTP 200 trả về HTML.
  - Xác minh End-to-End thực tế: Socket.IO snapshot, Bridge DB dispatch, và Playwright canvas render.
  - Tự động dọn dẹp sạch cây tiến trình (process tree) và thoát với mã lỗi 1 nếu bất kỳ bước nào thất bại.
#>

param(
  [int]$ServerPort = 3001,
  [int]$ClientPort = 5174,
  [int]$MockViewers = 100,
  [switch]$OpenBrowser,
  [switch]$SkipBrowserVerification
)

$ErrorActionPreference = "Stop"
$RootPath = (Resolve-Path "$PSScriptRoot\..").Path

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "    ZOMBIE ĐẠI CHIẾN: THÀNH TRÌ CUỐI CÙNG — RUNNABLE DEMO ACCEPTANCE (P1.1)    " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# Hàm dọn dẹp khẩn cấp khi gặp lỗi (dừng cả process tree)
function Cleanup-Processes {
  param($pids)
  Write-Host "[CLEANUP] Đang dừng toàn bộ cây tiến trình đã khởi tạo..." -ForegroundColor Yellow
  foreach ($p in $pids) {
    if ($p -and $p.Id) {
      & taskkill /PID $p.Id /T /F 2>$null | Out-Null
      Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    }
  }
}

$spawnedProcesses = @()

# 1. Kiểm tra build artifacts trước khi khởi động
Write-Host "[PRE-FLIGHT] Kiểm tra artifacts bản dựng sản phẩm..." -ForegroundColor Yellow

# P1.4 Windows Process Safety: Dừng các tiến trình thuộc phiên demo cũ (nếu có .demo_pids.json)
$oldPidFile = Join-Path $RootPath ".demo_pids.json"
if (Test-Path $oldPidFile) {
  Write-Host "[PRE-FLIGHT] Tìm thấy phiên demo trước đó. Đang dừng an toàn..." -ForegroundColor Yellow
  & "$PSScriptRoot\stop-demo.ps1"
  Start-Sleep -Milliseconds 600
}

# Kiểm tra an toàn: Tuyệt đối không taskkill tùy tiện các tiến trình ngoài luồng của người dùng
foreach ($port in @($ServerPort, $ClientPort)) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conns) {
    $owningPids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pId in $owningPids) {
      if ($pId -gt 0) {
        $p = Get-Process -Id $pId -ErrorAction SilentlyContinue
        $pName = if ($p) { $p.ProcessName } else { "Không rõ" }
        Write-Host "[FAIL] Cổng $port đang được sử dụng bởi tiến trình bên ngoài: PID $pId ($pName)." -ForegroundColor Red
        Write-Host "[SAFETY] Hệ thống từ chối tắt ứng dụng khác trên Windows của bạn. Vui lòng giải phóng cổng hoặc cấu hình -ServerPort / -ClientPort khác!" -ForegroundColor Red
        exit 1
      }
    }
  }
}

$serverDist = Join-Path $RootPath "apps/game-server/dist/index.js"
$bridgeDist = Join-Path $RootPath "apps/live-bridge/dist/cli.js"
$clientDist = Join-Path $RootPath "apps/game-client/dist/index.html"

$needBuild = (-not (Test-Path $serverDist)) -or (-not (Test-Path $bridgeDist)) -or (-not (Test-Path $clientDist))
if ($needBuild) {
  Write-Host "[BUILD] Thiếu artifacts bản dựng. Đang tiến hành pnpm run build..." -ForegroundColor Yellow
  & pnpm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Biên dịch dự án thất bại!" -ForegroundColor Red
    exit 1
  }
}
Write-Host "[PRE-FLIGHT PASS] Tất cả build artifacts đã sẵn sàng." -ForegroundColor Green

# 2. Thiết lập biến môi trường demo cục bộ (Không mở ra ngoài localhost)
$env:NODE_ENV = "development"
$env:PORT = "$ServerPort"
$env:GAME_SERVER_URL = "http://127.0.0.1:$ServerPort"
$env:CLIENT_URL = "http://127.0.0.1:$ClientPort"
$env:ADMIN_SECRET_KEY = "admin_super_secret_production_2026_key"
$env:LIVE_BRIDGE_INGRESS_TOKEN = "live_bridge_ingress_secret_2026_token"
$env:PROVIDER_MODE = "mock"
$env:MOCK_VIEWERS = "$MockViewers"

# 3. Khởi chạy Game Server Authoritative
Write-Host "[1/4] Khởi động Game Server trên cổng $ServerPort..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm --filter @zombie-live/game-server start" -WorkingDirectory $RootPath -PassThru -WindowStyle Hidden
$spawnedProcesses += $serverProcess

# Chờ Game Server sẵn sàng bằng endpoint /ready (xác minh cả DB và Engine)
Write-Host "[1/4] Đang chờ Game Server /ready..." -NoNewline
$serverReady = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 800
  try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:$ServerPort/ready" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($res -and $res.status -eq "ready" -and $res.engine -and $res.engine.phase) {
      $serverReady = $true
      break
    }
  } catch {}
  Write-Host "." -NoNewline
}

if (-not $serverReady) {
  Write-Host "`n[FAIL] Game Server không phản hồi /ready sau 24 giây. Dừng kịch bản." -ForegroundColor Red
  Cleanup-Processes $spawnedProcesses
  exit 1
}
Write-Host " [PASS: Engine Phase $($res.engine.phase), Base HP $($res.engine.baseHp)]" -ForegroundColor Green

# 4. Khởi chạy Live Bridge Runner (Mock 100 Viewers)
Write-Host "[2/4] Khởi động Live Bridge Runner ($MockViewers viewers tương tác)..." -ForegroundColor Yellow
$bridgeProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm --filter @zombie-live/live-bridge start" -WorkingDirectory $RootPath -PassThru -WindowStyle Hidden
$spawnedProcesses += $bridgeProcess

Start-Sleep -Seconds 3

# Kiểm tra Bridge tiến trình có sống không
$bridgeAlive = Get-Process -Id $bridgeProcess.Id -ErrorAction SilentlyContinue
if (-not $bridgeAlive -or $bridgeAlive.HasExited) {
  Write-Host "[FAIL] Live Bridge tiến trình đã thoát bất ngờ sau khi khởi động!" -ForegroundColor Red
  Cleanup-Processes $spawnedProcesses
  exit 1
}
Write-Host "[PASS] Live Bridge đang hoạt động liên tục (PID $($bridgeProcess.Id))." -ForegroundColor Green

# 5. Khởi chạy Game Client Preview (Vite Static Server)
Write-Host "[3/4] Khởi động Game Client Preview trên cổng $ClientPort..." -ForegroundColor Yellow
$clientProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c pnpm --filter @zombie-live/game-client run preview --port $ClientPort --host" -WorkingDirectory $RootPath -PassThru -WindowStyle Hidden
$spawnedProcesses += $clientProcess

# Xác minh Game Client trả lời HTTP 200 và chứa thẻ HTML
Write-Host "[3/4] Đang kiểm tra HTTP 200 Game Client..." -NoNewline
$clientReady = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Milliseconds 600
  try {
    $clientRes = Invoke-WebRequest -Uri "http://127.0.0.1:$ClientPort/" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($clientRes -and $clientRes.StatusCode -eq 200 -and ($clientRes.Content -match "<!doctype html>" -or $clientRes.Content -match "<html")) {
      $clientReady = $true
      break
    }
  } catch {}
  Write-Host "." -NoNewline
}

if (-not $clientReady) {
  Write-Host "`n[FAIL] Game Client không trả về HTTP 200 HTML sau 12 giây!" -ForegroundColor Red
  Cleanup-Processes $spawnedProcesses
  exit 1
}
Write-Host " [PASS: HTTP 200 OK]" -ForegroundColor Green

# 6. Xác minh luồng dữ liệu thực tế (Pipeline E2E Ready Verification - P1.1)
Write-Host "[4/4] Xác minh End-to-End Pipeline: Socket.IO Snapshot, Bridge Ingress, Phaser Canvas..." -ForegroundColor Yellow
if (-not $SkipBrowserVerification) {
  & pnpm --filter @zombie-live/game-client run verify:pipeline
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Kiểm tra xác minh Pipeline Demo thất bại! Dọn dẹp và dừng hệ thống." -ForegroundColor Red
    Cleanup-Processes $spawnedProcesses
    exit 1
  }
} else {
  Write-Host "[4/4] Bỏ qua kiểm tra browser (cờ SkipBrowserVerification)." -ForegroundColor Gray
}

# Lưu thông tin PID để script stop-demo.ps1 dừng sạch sẽ
$demoPidFile = Join-Path $RootPath ".demo_pids.json"
@{
  serverPid = $serverProcess.Id
  bridgePid = $bridgeProcess.Id
  clientPid = $clientProcess.Id
  startedAt = (Get-Date).ToString("o")
  serverPort = $ServerPort
  clientPort = $ClientPort
} | ConvertTo-Json | Set-Content -Path $demoPidFile

Write-Host "`n================================================================================" -ForegroundColor Green
Write-Host " [DEMO READY] TẤT CẢ THÀNH PHẦN DEMO LIVE ĐÃ KHỞI CHẠY VÀ SẴN SÀNG!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host " [OBS Overlay]      http://localhost:$ClientPort/overlay" -ForegroundColor White
Write-Host " [Game Canvas]       http://localhost:$ClientPort/" -ForegroundColor White
Write-Host " [Admin Dashboard]  http://localhost:$ServerPort/admin" -ForegroundColor White
Write-Host " [Server Ready]     http://localhost:$ServerPort/ready" -ForegroundColor White
Write-Host " [Live Telemetry]   http://localhost:$ServerPort/api/admin/monitoring" -ForegroundColor White
Write-Host "================================================================================" -ForegroundColor Green
Write-Host " * Luồng dữ liệu hoàn chỉnh: Mock 100 Viewers -> Live Bridge CLI -> Ingress Token -> Gift Ledger -> Outbox -> Authoritative Engine (20Hz) -> Phaser Canvas/OBS" -ForegroundColor Cyan
Write-Host " * Để dừng toàn bộ hệ thống demo: Chạy .\scripts\stop-demo.ps1`n" -ForegroundColor DarkGray

if ($OpenBrowser) {
  Start-Process "http://localhost:$ClientPort/overlay"
}
