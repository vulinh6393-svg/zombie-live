<#
.SYNOPSIS
  Sao lưu dữ liệu PGlite (.data/pglite) an toàn, tạo manifest.json chứa checksum SHA256 từng file.
#>

param(
  [string]$SourceDir = ".data/pglite",
  [string]$BackupDir = "backups"
)

$ErrorActionPreference = "Stop"
$RootPath = (Resolve-Path "$PSScriptRoot\..").Path
$FullSource = Join-Path $RootPath $SourceDir
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$TargetBackup = Join-Path $RootPath "$BackupDir\db_backup_$Timestamp"

# Đồng bộ thư mục: fallback kiểm tra nếu cần
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

# Tạo manifest.json với SHA256 checksum từng file (P0.3)
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
  files = $fileList
}

$manifestJsonPath = Join-Path $TargetBackup "manifest.json"
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestJsonPath -Encoding UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " [BACKUP SUCCESS] SAO LƯU DỮ LIỆU HOÀN TẤT VỚI MANIFEST SHA256:" -ForegroundColor Green
Write-Host " - Nguồn:      $FullSource" -ForegroundColor White
Write-Host " - Đích:       $TargetBackup" -ForegroundColor White
Write-Host " - Số lượng:   $($fileList.Count) files" -ForegroundColor White
Write-Host " - Dung lượng: $([Math]::Round($totalBytes / 1KB, 2)) KB" -ForegroundColor White
Write-Host " - Manifest:   $manifestJsonPath" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
