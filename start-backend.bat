@echo off
chcp 65001 >nul
echo ========================================
echo  后端服务本地启动脚本
echo ========================================

set JAVA_HOME=C:\Program Files\Java\jdk-17

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [错误] 未找到 JDK 17: %JAVA_HOME%
    echo 请确认 C:\Program Files\Java\jdk-17 是否存在，或手动修改本脚本中的 JAVA_HOME
    pause
    exit /b 1
)

echo 使用 JDK: %JAVA_HOME%
set PATH=%JAVA_HOME%\bin;%PATH%

echo 正在使用 Java 版本:
java -version

echo.
echo 正在启动 Spring Boot 后端服务（local 环境）...
call .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

pause
