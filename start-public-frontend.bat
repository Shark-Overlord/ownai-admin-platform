@echo off
chcp 65001 >nul
echo ========================================
echo  OwnAI 用户前台本地启动脚本
echo ========================================
if not exist web-frontend\node_modules echo 首次启动请先在 web-frontend 中执行 npm ci
echo 正在启动用户前台（http://127.0.0.1:5187）...
cd web-frontend
call npm run dev
pause
