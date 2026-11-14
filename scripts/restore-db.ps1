<#
.SYNOPSIS
  Khôi phục dữ liệu PGlite từ bản sao lưu, kiểm tra nghiêm ngặt manifest.json,
  SHA256 checksum từng file và đối chiếu dữ liệu SQL với preBackupStats (P0.2).
#>

param(
  [string]$BackupPath,
  [string]$TargetDir = ".data/pglite_restored",
  [switch]$OverwriteActiveDb
)

$ErrorActionPreference = "Stop"
$RootPath = (Resolve-Path "$PSScriptRoot\..").Path

if ($OverwriteActiveDb) {
  $TargetDir = ".data/pglite"
}

if (-not $BackupPath) {
  $BackupsFolder = Join-Path $RootPath "backups"
  if (Test-Path $BackupsFolder) {
    $latest = Get-ChildItem -Path $BackupsFolder -Directory | Sort-Object CreationTime -Descending | Select-Object -First 1
    if ($latest) {
      $BackupPath = $latest.FullName
    }
  }
}

if (-not $BackupPath -or -not (Test-Path $BackupPath)) {
  Write-Host "[ERROR] Không tìm thấy bản sao lưu hợp lệ tại: $BackupPath" -ForegroundColor Red
  exit 1
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " [RESTORE] BẮT ĐẦU KHÔI PHỤC VÀ KIỂM TRA TOÀN VẸN (P0.2)" -ForegroundColor Cyan
Write-Host " - Bản sao lưu: $BackupPath" -ForegroundColor White

# 1. Bắt buộc phải có manifest.json (Fail-Closed)
$manifestFile = Join-Path $BackupPath "manifest.json"
if (-not (Test-Path $manifestFile)) {
  Write-Host "[FAIL] Không tìm thấy manifest.json trong bản sao lưu! Không thể xác minh toàn vẹn." -ForegroundColor Red
  exit 1
}

Write-Host "[1/3] Kiểm tra tính toàn vẹn file bằng SHA256 checksum từ manifest..." -ForegroundColor Yellow
$manifest = Get-Content -Path $manifestFile -Raw | ConvertFrom-Json
$checkedCount = 0

foreach ($entry in $manifest.files) {
  $filePath = Join-Path $BackupPath $entry.path
  if (-not (Test-Path $filePath)) {
    Write-Host "[FAIL] File bị thiếu trong bản sao lưu: $($entry.path)" -ForegroundColor Red
    exit 1
  }
  $actualHash = (Get-FileHash -Path $filePath -Algorithm SHA256).Hash
  if ($actualHash -ne $entry.sha256) {
    Write-Host "[FAIL] Sai lệch SHA256 cho file $($entry.path)! Kỳ vọng $($entry.sha256), thực tế $actualHash" -ForegroundColor Red
    exit 1
  }
  $checkedCount++
}
Write-Host "[OK] Đã xác minh $checkedCount/$($manifest.fileCount) files khớp 100% SHA256." -ForegroundColor Green

# 2. Khôi phục files vào TargetDir
$FullTarget = Join-Path $RootPath $TargetDir
Write-Host "[2/3] Sao chép files vào thư mục đích: $FullTarget..." -ForegroundColor Yellow

if (Test-Path $FullTarget) {
  $TempSafety = Join-Path $RootPath ".data/pglite_safety_before_restore"
  Copy-Item -Path "$FullTarget\*" -Destination $TempSafety -Recurse -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $FullTarget -Force | Out-Null

Get-ChildItem -Path $BackupPath | Where-Object { $_.Name -ne "manifest.json" } | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination $FullTarget -Recurse -Force
}

# 3. Chạy verify-backup.js để truy vấn SQL thực tế và đối chiếu với manifest preBackupStats
Write-Host "[3/3] Thực thi truy vấn SQL và đối chiếu dữ liệu với preBackupStats..." -ForegroundColor Yellow
$verifyScript = Join-Path $RootPath "packages/database/dist/verify-backup.js"

if (-not (Test-Path $verifyScript)) {
  Write-Host "[BUILD] Đang biên dịch packages/database..." -ForegroundColor Gray
  & pnpm --filter @zombie-live/database build | Out-Null
}

$verifyOutput = & node $verifyScript "$FullTarget" --manifest "$manifestFile"
$verifyCode = $LASTEXITCODE

if ($verifyCode -ne 0) {
  Write-Host "[FAIL] Kiểm tra toàn vẹn SQL hoặc đối chiếu dữ liệu thất bại! Mã lỗi: $verifyCode" -ForegroundColor Red
  Write-Host $verifyOutput -ForegroundColor Red
  exit 1
}

Write-Host $verifyOutput -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " [RESTORE PASS] CƠ SỞ DỮ LIỆU ĐÃ KHÔI PHỤC VÀ ĐƯỢC XÁC MINH SQL THÀNH CÔNG 100%!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
