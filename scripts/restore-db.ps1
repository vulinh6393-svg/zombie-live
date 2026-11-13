<#
.SYNOPSIS
  Khôi phục dữ liệu PGlite từ bản sao lưu và kiểm tra tính toàn vẹn.
#>

param(
  [string]$BackupPath,
  [string]$TargetDir = ".data/pglite"
)

$ErrorActionPreference = "Stop"
$RootPath = Resolve-Path "$PSScriptRoot\.."

if (-not $BackupPath) {
  # Lấy bản sao lưu mới nhất trong thư mục backups
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

$FullTarget = Join-Path $RootPath $TargetDir

Write-Host "[RESTORE] Khôi phục dữ liệu từ $BackupPath sang $FullTarget..." -ForegroundColor Cyan

# Bảo vệ: Sao lưu tạm thư mục đích hiện tại nếu có
if (Test-Path $FullTarget) {
  $TempSafety = Join-Path $RootPath ".data/pglite_safety_before_restore"
  Copy-Item -Path "$FullTarget\*" -Destination $TempSafety -Recurse -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $FullTarget -Force | Out-Null
Copy-Item -Path "$BackupPath\*" -Destination $FullTarget -Recurse -Force

$restoredFiles = Get-ChildItem -Path $FullTarget -Recurse -File
Write-Host "[OK] Đã khôi phục thành công $($restoredFiles.Count) files vào $FullTarget" -ForegroundColor Green
