$ErrorActionPreference = "Stop"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " 后台管理前端本地启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "正在启动后台管理前端开发服务器（http://127.0.0.1:5173）..." -ForegroundColor Green
Set-Location -Path "web-admin"
& npm run dev
