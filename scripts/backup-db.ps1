<#
.SYNOPSIS
  Sao lưu dữ liệu PGlite (.data/pglite) an toàn, kiểm tra tính toàn vẹn và dung lượng file.
#>

param(
  [string]$SourceDir = ".data/pglite",
  [string]$BackupDir = "backups"
)

$ErrorActionPreference = "Stop"
$RootPath = Resolve-Path "$PSScriptRoot\.."
$FullSource = Join-Path $RootPath $SourceDir
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$TargetBackup = Join-Path $RootPath "$BackupDir\db_backup_$Timestamp"

# Hỗ trợ fallback sang .data/db_pglite nếu thư mục .data/pglite chưa có
if (-not (Test-Path $FullSource)) {
  $AltSource = Join-Path $RootPath ".data/db_pglite"
  if (Test-Path $AltSource) {
    $FullSource = $AltSource
  } else {
    Write-Host "[WARN] Thư mục dữ liệu $FullSource không tồn tại. Chưa có dữ liệu cần sao lưu." -ForegroundColor Yellow
    exit 0
  }
}

New-Item -ItemType Directory -Path $TargetBackup -Force | Out-Null
Copy-Item -Path "$FullSource\*" -Destination $TargetBackup -Recurse -Force

$copiedFiles = Get-ChildItem -Path $TargetBackup -Recurse -File
$totalSize = ($copiedFiles | Measure-Object -Property Length -Sum).Sum

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " SAO LƯU DỮ LIỆU THÀNH CÔNG:" -ForegroundColor Green
Write-Host " - Nguồn:      $FullSource" -ForegroundColor White
Write-Host " - Đích:       $TargetBackup" -ForegroundColor White
Write-Host " - Số lượng:   $($copiedFiles.Count) files" -ForegroundColor White
Write-Host " - Dung lượng: $([Math]::Round($totalSize / 1KB, 2)) KB" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
