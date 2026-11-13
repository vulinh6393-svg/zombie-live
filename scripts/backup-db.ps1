<#
.SYNOPSIS
  Sao lưu dữ liệu SQLite/PGlite hoặc xuất dữ liệu PostgreSQL phục vụ khôi phục thảm họa.
#>

param(
  [string]$SourceDir = ".data/db_pglite",
  [string]$BackupDir = "backups"
)

$ErrorActionPreference = "Stop"
$RootPath = Resolve-Path "$PSScriptRoot\.."
$FullSource = Join-Path $RootPath $SourceDir
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$TargetBackup = Join-Path $RootPath "$BackupDir\db_backup_$Timestamp"

if (-not (Test-Path $FullSource)) {
  Write-Host "[WARN] Thư mục dữ liệu $FullSource không tồn tại. Chưa có dữ liệu cần sao lưu." -ForegroundColor Yellow
  exit 0
}

New-Item -ItemType Directory -Path $TargetBackup -Force | Out-Null
Copy-Item -Path "$FullSource\*" -Destination $TargetBackup -Recurse -Force

Write-Host "[OK] Sao lưu hoàn tất vào thư mục: $TargetBackup" -ForegroundColor Green
