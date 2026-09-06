$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " OwnAI 用户前台本地启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Push-Location -Path "web-frontend"
try {
    if (-not (Test-Path -LiteralPath "node_modules")) {
        Write-Host "首次启动请先在 web-frontend 中执行 npm ci" -ForegroundColor Yellow
    }
    Write-Host "正在启动用户前台（http://127.0.0.1:5187）..." -ForegroundColor Green
    & npm run dev
} finally {
    Pop-Location
}
