@echo off
chcp 65001 >nul
echo ========================================
echo  后台管理前端本地启动脚本
echo ========================================
echo 正在启动后台管理前端开发服务器（http://127.0.0.1:5173）...
cd web-admin
call npm run dev

pause
