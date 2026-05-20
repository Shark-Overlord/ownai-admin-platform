$ErrorActionPreference = "Stop"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " 后端服务本地启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
if (-not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    Write-Host "[错误] 未找到 JDK 17: $env:JAVA_HOME" -ForegroundColor Red
    Write-Host "请确认 C:\Program Files\Java\jdk-17 是否存在，或手动修改本脚本中的 JAVA_HOME" -ForegroundColor Red
    exit 1
}
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
Write-Host "使用 JDK: $env:JAVA_HOME" -ForegroundColor Yellow

Write-Host "正在使用 Java 版本:" -ForegroundColor Yellow
& java -version

Write-Host "`n正在启动 Spring Boot 后端服务（local 环境）..." -ForegroundColor Green
& .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
