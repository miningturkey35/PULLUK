@echo off
echo PULLUK sunucusu baslatiliyor...
echo Tarayicida ac: http://localhost:8080
echo Durdurmak icin Ctrl+C
echo.
cd /d "%~dp0"
node server.js
