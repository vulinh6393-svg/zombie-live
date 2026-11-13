<#
.SYNOPSIS
  Kiểm tra tính sẵn sàng và trạng thái vận hành của Game Server và Database.
#>

param(
  [string]$ServerUrl = "http://127.0.0.1:3001"
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "--- Kiểm Tra Sức Khỏe Zombie Live Server ---" -ForegroundColor Cyan

try {
  $health = Invoke-RestMethod -Uri "$ServerUrl/health" -Method Get -TimeoutSec 3
  Write-Host "[OK] /health: status=$($health.status), tick=$($health.engineTick), phase=$($health.phase), baseHp=$($health.baseHp)" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] /health không phản hồi: $_" -ForegroundColor Red
}

try {
  $ready = Invoke-RestMethod -Uri "$ServerUrl/ready" -Method Get -TimeoutSec 3
  Write-Host "[OK] /ready: status=$($ready.status), uptime=$($ready.uptime)s" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] /ready báo lỗi hoặc degrade: $_" -ForegroundColor Red
}
