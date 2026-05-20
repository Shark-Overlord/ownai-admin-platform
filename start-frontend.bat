@echo off
chcp 65001 >nul
echo ========================================
echo  前端服务本地启动脚本
echo ========================================
echo 正在启动前端开发服务器...
cd web-admin
call npm run dev

pause
