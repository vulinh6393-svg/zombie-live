<#
.SYNOPSIS
  Sao lưu cơ sở dữ liệu PGlite một cách nhất quán (Consistent Snapshot) và an toàn (Fail-Closed).
  P0.1: Kích hoạt maintenance barrier qua /api/admin/db/quiesce để chặn hoàn toàn writes và drain in-flight requests.
  Fail ngay lập tức nếu quiesce thất bại. Luôn bảo đảm resume bằng khối try/finally.
#>

param(
  [string]$BackupName = "pglite_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')",
  [string]$ServerUrl = "http://127.0.0.1:3001",
  [string]$AdminSecret = "admin_super_secret_production_2026_key"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootPath = Resolve-Path "$ScriptDir\.."

# Tìm thư mục cơ sở dữ liệu thống nhất
$SourceCandidates = @(
  (Join-Path $RootPath ".data\pglite"),
  (Join-Path $RootPath "packages\database\.data\pglite")
)

$FullSource = $null
foreach ($cand in $SourceCandidates) {
  if (Test-Path $cand) {
    $FullSource = $cand
    break
  }
}

if (-not $FullSource) {
  Write-Host "[FAIL] Không tìm thấy thư mục cơ sở dữ liệu PGlite nguồn (.data\pglite). Hủy sao lưu." -ForegroundColor Red
  exit 1
}

$TargetBackup = Join-Path $RootPath ".data\backups\$BackupName"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " [BACKUP START] BẮT ĐẦU SAO LƯU DỮ LIỆU NHẤT QUÁN (P0.1)" -ForegroundColor Cyan
Write-Host " - Thư mục nguồn: $FullSource" -ForegroundColor White
Write-Host " - Thư mục đích: $TargetBackup" -ForegroundColor White

$isServerRunning = $false
$preBackupStats = $null
$headers = @{
  "x-admin-token" = $AdminSecret
  "Content-Type" = "application/json"
}

# 1. Kiểm tra nếu Game Server đang chạy (bằng socket hoặc HTTP health/ready)
$serverPort = 3001
$tcpConn = Get-NetTCPConnection -LocalPort $serverPort -State Listen -ErrorAction SilentlyContinue
if ($tcpConn) {
  $isServerRunning = $true
} else {
  try {
    $h = Invoke-RestMethod -Uri "$ServerUrl/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($h) { $isServerRunning = $true }
  } catch {}
}

if ($isServerRunning) {
  Write-Host "[1/4] Game Server đang chạy trên $ServerUrl. Kích hoạt /api/admin/db/quiesce..." -ForegroundColor Yellow
  try {
    $quiesceRes = Invoke-RestMethod -Uri "$ServerUrl/api/admin/db/quiesce" -Method Post -Headers $headers -TimeoutSec 10
    if (-not $quiesceRes -or $quiesceRes.success -ne $true -or $quiesceRes.status -ne "quiesced") {
      throw "Quiesce thất bại hoặc còn active writers: $(ConvertTo-Json $quiesceRes)"
    }
    if ($quiesceRes.stats) {
      $preBackupStats = $quiesceRes.stats
    }
    Write-Host "[PASS] Đã kích hoạt maintenance barrier: chặn Live Bridge ingress, tạm dừng Engine và Outbox worker, đóng PGlite an toàn." -ForegroundColor Green
  } catch {
    Write-Host "[FATAL ERROR] Không thể quiesce database an toàn: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "[FAIL-CLOSED] DỪNG SAO LƯU NGAY LẬP TỨC ĐỂ TRÁNH DỮ LIỆU KHÔNG NHẤT QUÁN!" -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "[1/4] Game Server không chạy. Tiến hành sao lưu ở trạng thái nghỉ an toàn (Offline backup)." -ForegroundColor Yellow
}

try {
  # Lấy thống kê pre-backup nếu server đang chạy
  if ($isServerRunning) {
    try {
      $statsRes = Invoke-RestMethod -Uri "$ServerUrl/api/admin/db/stats" -Method Get -Headers $headers -TimeoutSec 5
      if ($statsRes -and $statsRes.stats) {
        $preBackupStats = $statsRes.stats
        Write-Host "[PASS] Pre-backup stats captured: Players $($preBackupStats.players), TotalXP $($preBackupStats.totalXp), Gifts $($preBackupStats.giftEvents), Outbox $($preBackupStats.outboxEvents), Journal $($preBackupStats.commandJournal), Matches $($preBackupStats.matches), ProcessedEvents $($preBackupStats.processedEvents)" -ForegroundColor White
      }
    } catch {
      Write-Host "[WARN] Không thể lấy stats pre-backup: $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }

  # Đợi ngắn để đảm bảo OS flush dirty pages
  Start-Sleep -Milliseconds 400

  # 2. Sao chép dữ liệu vào thư mục sao lưu
  Write-Host "[2/4] Sao chép toàn bộ files sang $TargetBackup..." -ForegroundColor Yellow
  New-Item -ItemType Directory -Path $TargetBackup -Force | Out-Null
  Copy-Item -Path "$FullSource\*" -Destination $TargetBackup -Recurse -Force

  # 3. Tạo manifest.json với SHA256 checksum từng file và preBackupStats
  Write-Host "[3/4] Tính toán SHA256 checksums và tạo manifest.json..." -ForegroundColor Yellow
  $copiedFiles = Get-ChildItem -Path $TargetBackup -Recurse -File
  $fileList = @()
  $totalBytes = 0

  foreach ($file in $copiedFiles) {
    if ($file.Name -eq "manifest.json") { continue }
    $hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
    $relPath = $file.FullName.Substring($TargetBackup.Length).TrimStart('\', '/')
    $fileList += @{
      path = $relPath
      bytes = $file.Length
      sha256 = $hash
    }
    $totalBytes += $file.Length
  }

  $manifestObj = @{
    backupName = $BackupName
    createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    fileCount = $fileList.Count
    totalBytes = $totalBytes
    preBackupStats = $preBackupStats
    files = $fileList
  }

  $manifestPath = Join-Path $TargetBackup "manifest.json"
  $manifestJson = $manifestObj | ConvertTo-Json -Depth 5
  # Ghi UTF-8 không có BOM để tránh lỗi cú pháp khi node JSON.parse
  [System.IO.File]::WriteAllText($manifestPath, $manifestJson, [System.Text.UTF8Encoding]::new($false))
  Write-Host "[PASS] Manifest tạo thành công tại: $manifestPath ($($fileList.Count) files, $totalBytes bytes)." -ForegroundColor Green
  $backupSucceeded = $true
} catch {
  Write-Host "[FATAL ERROR] Lỗi trong quá trình sao lưu: $($_.Exception.Message)" -ForegroundColor Red
  $backupSucceeded = $false
} finally {
  # 4. Luôn luôn resume Game Server trong finally block nếu đã quiesce
  if ($isServerRunning) {
    Write-Host "[4/4] Phục hồi hoạt động bình thường qua /api/admin/db/resume..." -ForegroundColor Yellow
    try {
      $resumeRes = Invoke-RestMethod -Uri "$ServerUrl/api/admin/db/resume" -Method Post -Headers $headers -TimeoutSec 5
      Write-Host "[PASS] Đã resume Engine, Outbox worker và mở lại DB ingress." -ForegroundColor Green
    } catch {
      Write-Host "[CRITICAL] Không thể tự động resume server: $($_.Exception.Message)" -ForegroundColor Red
    }
  } else {
    Write-Host "[4/4] Bỏ qua resume (server offline)." -ForegroundColor Gray
  }
}

if (-not $backupSucceeded) {
  Write-Host "================================================================" -ForegroundColor Red
  Write-Host " [BACKUP FAILED] SAO LƯU THẤT BẠI. DỮ LIỆU CHƯA ĐƯỢC SAO LƯU AN TOÀN!" -ForegroundColor Red
  Write-Host "================================================================" -ForegroundColor Red
  exit 1
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " [BACKUP SUCCESS] SAO LƯU NHẤT QUÁN HOÀN TẤT: $BackupName" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
