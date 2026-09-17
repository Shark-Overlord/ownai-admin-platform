<#
.SYNOPSIS
  OwnAI 部署脚本 - 按模块备份并部署到生产服务器

.DESCRIPTION
  支持三个开关：-Backend -Admin -Frontend，可组合使用。
  每次部署前自动在服务器创建备份，部署后验证健康，并输出回退命令。

.EXAMPLE
  # 仅部署后端
  .\deploy.ps1 -Backend

  # 仅部署前台
  .\deploy.ps1 -Frontend

  # 部署后端 + 管理后台
  .\deploy.ps1 -Backend -Admin

  # 全量部署
  .\deploy.ps1 -Backend -Admin -Frontend
#>

param(
    [switch]$Backend,
    [switch]$Admin,
    [switch]$Frontend
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# 配置
$SSH_ALIAS    = 'ownai'
$BACKEND_PATH = '/opt/springboot-init'
$ADMIN_PATH   = '/www/wwwroot/springboot-init-admin'
$FRONTEND_PATH= '/www/wwwroot/ownai'
$BACKEND_API  = 'http://127.0.0.1:8011/api/user/get/login'

# 校验参数
if (-not ($Backend -or $Admin -or $Frontend)) {
    Write-Error "请至少指定一个部署目标：-Backend / -Admin / -Frontend"
    exit 1
}

# 生成 release 名称
$timestamp    = Get-Date -Format 'yyyyMMdd-HHmmss'
$commitShort  = git rev-parse --short HEAD 2>$null
if (-not $commitShort) { $commitShort = 'unknown' }
$releaseName  = "$timestamp-$commitShort"
$releasePath  = "$BACKEND_PATH/releases/$releaseName"

Write-Host ""
Write-Host "===== OwnAI 部署开始 =====" -ForegroundColor Cyan
Write-Host "Release : $releaseName"
Write-Host "模块    : $(if($Backend){'Backend '})$(if($Admin){'Admin '})$(if($Frontend){'Frontend'})"
Write-Host ""

# Step 1: 服务器备份
Write-Host "[1] 备份服务器当前版本..." -ForegroundColor Yellow

$backupLines = @("set -euo pipefail", "mkdir -p '$releasePath'")
if ($Backend)  { $backupLines += "cp -p '$BACKEND_PATH/app.jar' '$releasePath/app.jar.before' && echo 'Backend backed up'" }
if ($Admin)    { $backupLines += "tar -czf '$releasePath/admin.before.tar.gz' -C '$ADMIN_PATH' . && echo 'Admin backed up'" }
if ($Frontend) { $backupLines += "tar -czf '$releasePath/frontend.before.tar.gz' -C '$FRONTEND_PATH' . && echo 'Frontend backed up'" }
$backupLines += "echo '备份目录: $releasePath'"

ssh $SSH_ALIAS ($backupLines -join '; ')
Write-Host "✓ 备份完成" -ForegroundColor Green
Write-Host ""

# Step 2: 本地构建
Write-Host "[2] 本地构建..." -ForegroundColor Yellow

if ($Backend) {
    Write-Host "  构建后端 JAR..."
    & .\mvnw.cmd -B -DskipTests package
    if ($LASTEXITCODE -ne 0) { Write-Error "后端构建失败"; exit 1 }
    Write-Host "  ✓ 后端构建完成" -ForegroundColor Green
}

if ($Admin) {
    Write-Host "  构建 web-admin..."
    Push-Location web-admin
    try { npm run build; if ($LASTEXITCODE -ne 0) { throw "构建失败" } }
    finally { Pop-Location }
    Write-Host "  ✓ web-admin 构建完成" -ForegroundColor Green
}

if ($Frontend) {
    Write-Host "  构建 web-frontend..."
    Push-Location web-frontend
    try { npm run build; if ($LASTEXITCODE -ne 0) { throw "构建失败" } }
    finally { Pop-Location }
    Write-Host "  ✓ web-frontend 构建完成" -ForegroundColor Green
}
Write-Host ""

# Step 3: 上传 & 部署
Write-Host "[3] 上传并部署..." -ForegroundColor Yellow

if ($Backend) {
    Write-Host "  上传后端 JAR..."
    $jarFile = Get-ChildItem target -Filter '*.jar' | Where-Object { $_.Name -notmatch '^original-' } | Select-Object -First 1
    if (-not $jarFile) { Write-Error "找不到 target/*.jar"; exit 1 }
    scp $jarFile.FullName "${SSH_ALIAS}:${BACKEND_PATH}/app.jar.tmp"

    Write-Host "  激活并重启后端..."
    $restartScript = @"
set -euo pipefail
mv '$BACKEND_PATH/app.jar.tmp' '$BACKEND_PATH/app.jar'
sudo systemctl restart springboot-init
for i in `$(seq 1 45); do
  state=`$(systemctl is-active springboot-init || true)
  result=`$(curl --max-time 3 -fsS '$BACKEND_API' 2>/dev/null || true)
  if [ "`$state" = "active" ] && echo "`$result" | grep -q '"code"'; then
    echo "后端已就绪"; exit 0
  fi
  sleep 2
done
systemctl status springboot-init --no-pager || true
exit 1
"@
    ssh $SSH_ALIAS $restartScript
    Write-Host "  ✓ 后端部署完成" -ForegroundColor Green
}

if ($Admin) {
    Write-Host "  部署 web-admin..."
    rsync -r --no-perms --no-owner --no-group --exclude=index.html web-admin/dist/ "${SSH_ALIAS}:${ADMIN_PATH}/"
    scp web-admin/dist/index.html "${SSH_ALIAS}:${ADMIN_PATH}/index.html"
    Write-Host "  ✓ web-admin 部署完成" -ForegroundColor Green
}

if ($Frontend) {
    Write-Host "  部署 web-frontend..."
    rsync -r --no-perms --no-owner --no-group --exclude=index.html web-frontend/dist/ "${SSH_ALIAS}:${FRONTEND_PATH}/"
    scp web-frontend/dist/index.html "${SSH_ALIAS}:${FRONTEND_PATH}/index.html"
    Write-Host "  ✓ web-frontend 部署完成" -ForegroundColor Green
}
Write-Host ""

# Step 4: 记录哈希
Write-Host "[4] 记录部署哈希..." -ForegroundColor Yellow
$hashParts = @()
if ($Backend)  { $hashParts += "sha256sum '$BACKEND_PATH/app.jar'" }
if ($Admin)    { $hashParts += "sha256sum '$ADMIN_PATH/index.html'" }
if ($Frontend) { $hashParts += "sha256sum '$FRONTEND_PATH/index.html'" }
ssh $SSH_ALIAS ("set -euo pipefail; " + ($hashParts -join '; '))
Write-Host ""

# Step 5: 输出回退命令
Write-Host "===== 部署完成 =====" -ForegroundColor Green
Write-Host "备份目录: $releasePath" -ForegroundColor Cyan
Write-Host ""
Write-Host "回退命令（如需回退复制到终端执行）:" -ForegroundColor Yellow

$rollbackParts = @()
if ($Backend)  { $rollbackParts += "cp -p '$releasePath/app.jar.before' '$BACKEND_PATH/app.jar'" }
if ($Admin)    { $rollbackParts += "tar -xzf '$releasePath/admin.before.tar.gz' -C '$ADMIN_PATH'" }
if ($Frontend) { $rollbackParts += "tar -xzf '$releasePath/frontend.before.tar.gz' -C '$FRONTEND_PATH'" }
if ($Admin -or $Frontend) {
    $rollbackParts += "find '$ADMIN_PATH' '$FRONTEND_PATH' -type d -exec chmod 755 {} + 2>/dev/null; find '$ADMIN_PATH' '$FRONTEND_PATH' -type f -exec chmod 644 {} + 2>/dev/null"
}
if ($Backend)  { $rollbackParts += "sudo systemctl restart springboot-init" }

$rollbackCmd = "ssh $SSH_ALIAS `"" + ($rollbackParts -join ' && ') + "`""
Write-Host $rollbackCmd -ForegroundColor Red
Write-Host ""
