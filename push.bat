@echo off
echo 🚀 饭小智 - 推送到 GitHub
echo ================================
echo.
cd /d "%~dp0"
node push-to-github.mjs
echo.
echo 按任意键关闭...
pause >nul
