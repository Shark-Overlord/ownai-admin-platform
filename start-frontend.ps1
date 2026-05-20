$ErrorActionPreference = "Stop"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " 前端服务本地启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "正在启动前端开发服务器..." -ForegroundColor Green
Set-Location -Path "web-admin"
& npm run dev
