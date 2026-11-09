@echo off
chcp 65001 >nul
title DON INVEST
cd /d "%~dp0"

echo.
echo  DON INVEST - iniciando
echo  ======================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [ERRO] Node.js nao encontrado.
  echo  Instale a versao LTS em https://nodejs.org e abra este arquivo de novo.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODEV=%%v
echo  Node.js %NODEV% encontrado.

if not exist "node_modules" (
  echo  Instalando dependencias - so na primeira vez, pode levar alguns minutos...
  call npm install
  if errorlevel 1 (
    echo  [ERRO] Falha no npm install. Veja as mensagens acima.
    pause
    exit /b 1
  )
)

echo.
echo  Abrindo http://localhost:3000 no navegador...
echo  Para encerrar o DON INVEST, feche esta janela ou pressione Ctrl+C.
echo.
start "" cmd /c "timeout /t 6 >nul & start http://localhost:3000"
call npm run dev
pause
