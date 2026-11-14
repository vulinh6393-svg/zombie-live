<#
.SYNOPSIS
  Sao lưu dữ liệu PGlite (.data/pglite) nhất quán (Consistent Database Backup - P0.2).
  Quiesce Game Server trước khi copy (hoặc kiểm tra an toàn khi server tắt),
  lấy thống kê dữ liệu pre-backup và tạo manifest.json chứa SHA256 từng file.
#>

param(
  [string]$SourceDir = ".data/pglite",
  [string]$BackupDir = "backups",
  [string]$ServerUrl = "http://127.0.0.1:3001",
  [string]$AdminSecret = "admin_super_secret_production_2026_key"
)

$ErrorActionPreference = "Stop"
$RootPath = (Resolve-Path "$PSScriptRoot\..").Path
$FullSource = Join-Path $RootPath $SourceDir
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$TargetBackup = Join-Path $RootPath "$BackupDir\db_backup_$Timestamp"

# Đồng bộ thư mục nguồn
if (-not (Test-Path $FullSource)) {
  $AltSource = Join-Path $RootPath ".data/db_pglite"
  if (Test-Path $AltSource) {
    $FullSource = $AltSource
  } else {
    Write-Host "[WARN] Thư mục dữ liệu $FullSource không tồn tại. Chưa có dữ liệu cần sao lưu." -ForegroundColor Yellow
    exit 0
  }
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " [BACKUP START] BẮT ĐẦU SAO LƯU DỮ LIỆU NHẤT QUÁN (P0.2)" -ForegroundColor Cyan
Write-Host " - Thư mục nguồn: $FullSource" -ForegroundColor White

$isServerRunning = $false
$preBackupStats = $null

# 1. Kiểm tra nếu Game Server đang hoạt động thì thực hiện Quiesce an toàn
try {
  $readyRes = Invoke-RestMethod -Uri "$ServerUrl/ready" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
  if ($readyRes -and $readyRes.status -eq "ready") {
    $isServerRunning = $true
  }
} catch {}

if ($isServerRunning) {
  Write-Host "[1/4] Game Server đang chạy trên $ServerUrl. Đang gọi /api/admin/db/quiesce..." -ForegroundColor Yellow
  try {
    $headers = @{
      "x-admin-token" = $AdminSecret
      "Content-Type" = "application/json"
    }
    $quiesceRes = Invoke-RestMethod -Uri "$ServerUrl/api/admin/db/quiesce" -Method Post -Headers $headers -TimeoutSec 5
    Write-Host "[PASS] Đã tạm dừng Engine và Outbox worker để đạt snapshot nhất quán." -ForegroundColor Green

    # Lấy thống kê pre-backup
    $statsRes = Invoke-RestMethod -Uri "$ServerUrl/api/admin/db/stats" -Method Get -Headers $headers -TimeoutSec 5
    if ($statsRes -and $statsRes.stats) {
      $preBackupStats = $statsRes.stats
      Write-Host "[PASS] Pre-backup stats captured: Players $($preBackupStats.players), TotalXP $($preBackupStats.totalXp), Gifts $($preBackupStats.giftEvents), Outbox $($preBackupStats.outboxEvents), Journal $($preBackupStats.commandJournal), Matches $($preBackupStats.matches)" -ForegroundColor White
    }
  } catch {
    Write-Host "[WARN] Không thể quiesce qua HTTP: $($_.Exception.Message). Tiếp tục sao lưu..." -ForegroundColor Yellow
  }
} else {
  Write-Host "[1/4] Game Server không chạy. Tiến hành sao lưu ở trạng thái nghỉ an toàn." -ForegroundColor Yellow
}

# Đợi ngắn để đảm bảo OS flush dirty pages
Start-Sleep -Milliseconds 400

# 2. Sao chép dữ liệu vào thư mục sao lưu
Write-Host "[2/4] Sao chép toàn bộ files sang $TargetBackup..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $TargetBackup -Force | Out-Null
Copy-Item -Path "$FullSource\*" -Destination $TargetBackup -Recurse -Force

# 3. Mở lại hoạt động của Game Server nếu đã quiesce
if ($isServerRunning) {
  Write-Host "[3/4] Phục hồi hoạt động bình thường qua /api/admin/db/resume..." -ForegroundColor Yellow
  try {
    $headers = @{
      "x-admin-token" = $AdminSecret
      "Content-Type" = "application/json"
    }
    $resumeRes = Invoke-RestMethod -Uri "$ServerUrl/api/admin/db/resume" -Method Post -Headers $headers -TimeoutSec 5
    Write-Host "[PASS] Đã resume Engine và Outbox worker." -ForegroundColor Green
  } catch {
    Write-Host "[WARN] Không thể resume qua HTTP: $($_.Exception.Message)" -ForegroundColor Yellow
  }
} else {
  Write-Host "[3/4] Bỏ qua resume (server offline)." -ForegroundColor Gray
}

# 4. Tạo manifest.json với SHA256 checksum từng file và preBackupStats
Write-Host "[4/4] Tính toán SHA256 checksums và tạo manifest.json..." -ForegroundColor Yellow
$copiedFiles = Get-ChildItem -Path $TargetBackup -Recurse -File
$fileList = @()
$totalBytes = 0

foreach ($file in $copiedFiles) {
  $relPath = $file.FullName.Substring($TargetBackup.Length).TrimStart('\', '/')
  $hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
  $totalBytes += $file.Length
  $fileList += @{
    path = $relPath
    bytes = $file.Length
    sha256 = $hash
  }
}

$manifest = @{
  backupTimestamp = $Timestamp
  sourceDir = $SourceDir
  fileCount = $fileList.Count
  totalBytes = $totalBytes
  preBackupStats = $preBackupStats
  files = $fileList
}

$manifestJsonPath = Join-Path $TargetBackup "manifest.json"
$manifestJsonString = $manifest | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($manifestJsonPath, $manifestJsonString, [System.Text.UTF8Encoding]::new($false))

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " [BACKUP SUCCESS] SAO LƯU DỮ LIỆU NHẤT QUÁN HOÀN TẤT VỚI MANIFEST:" -ForegroundColor Green
Write-Host " - Nguồn:        $FullSource" -ForegroundColor White
Write-Host " - Đích:         $TargetBackup" -ForegroundColor White
Write-Host " - Số lượng:     $($fileList.Count) files" -ForegroundColor White
Write-Host " - Dung lượng:   $([Math]::Round($totalBytes / 1KB, 2)) KB" -ForegroundColor White
Write-Host " - Manifest:     $manifestJsonPath" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
