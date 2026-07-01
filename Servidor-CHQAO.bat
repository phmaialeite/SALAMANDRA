@echo off
REM ============================================================================
REM  SALAMANDRA - SERVIDOR da rede (Caminho A) - Windows (Node do sistema).
REM  Rode em UMA maquina; as outras acessam pelo navegador no endereco exibido.
REM  (A versao PORTATIL com Node embutido esta na pasta SALAMANDRA-WINDOWS.)
REM ============================================================================
setlocal enabledelayedexpansion
title SALAMANDRA - SERVIDOR (nao feche esta janela)
cd /d "%~dp0backend"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node 22 LTS em https://nodejs.org
  pause & exit /b 1
)

if not exist "%LOCALAPPDATA%\SALAMANDRA" mkdir "%LOCALAPPDATA%\SALAMANDRA"
set "PGLITE_DIR=%LOCALAPPDATA%\SALAMANDRA\pgdata"

set "SECFILE=%LOCALAPPDATA%\SALAMANDRA\cookie-secret.txt"
node -e "const fs=require('fs'),f=process.env.SECFILE;if(!fs.existsSync(f))fs.writeFileSync(f,require('crypto').randomBytes(24).toString('hex'))"
set /p COOKIE_SECRET=<"%SECFILE%"

if not exist "%PGLITE_DIR%" (
  echo Primeira execucao: preparando a base (uma unica vez)...
  node --no-warnings src\seed.js
  if errorlevel 1 ( echo Falha ao preparar a base. & pause & exit /b 1 )
)

set "BK=%LOCALAPPDATA%\SALAMANDRA\backups"
if exist "%PGLITE_DIR%\PG_VERSION" (
  if not exist "%BK%" mkdir "%BK%"
  if exist "%BK%\base-5" rmdir /s /q "%BK%\base-5"
  if exist "%BK%\base-4" move "%BK%\base-4" "%BK%\base-5" >nul
  if exist "%BK%\base-3" move "%BK%\base-3" "%BK%\base-4" >nul
  if exist "%BK%\base-2" move "%BK%\base-2" "%BK%\base-3" >nul
  if exist "%BK%\base-1" move "%BK%\base-1" "%BK%\base-2" >nul
  robocopy "%PGLITE_DIR%" "%BK%\base-1" /E /NFL /NDL /NJH /NJS /NC /NS /NP >nul
)

set "IPFILE=%TEMP%\salamandra-ip.txt"
node -e "const o=require('os').networkInterfaces();let ip='';for(const k in o)for(const a of o[k])if(a.family==='IPv4'&&!a.internal){if(/^(192\.168\.|10\.|172\.)/.test(a.address)){ip=a.address}else if(!ip){ip=a.address}};require('fs').writeFileSync(process.env.IPFILE,ip||'127.0.0.1')"
set /p LANIP=<"%IPFILE%"

echo ================================================================
echo   SALAMANDRA - SERVIDOR NO AR
echo ----------------------------------------------------------------
echo   Nos OUTROS computadores, abra o navegador em:
echo.
echo         http://!LANIP!:8088
echo.
echo   Neste servidor:  http://127.0.0.1:8088   (0000 / 1234)
echo   Se os outros nao abrirem, rode (como admin) o
echo   "Liberar-Firewall-8088.bat" da pasta SALAMANDRA-WINDOWS.
echo   NAO feche esta janela enquanto estiver em uso.
echo ================================================================

if not defined SAL_NOBROWSER start "" /min powershell -NoProfile -Command "$u='http://127.0.0.1:8088'; for($i=0;$i -lt 60;$i++){ try{ [void](Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 2); Start-Process $u; break }catch{ Start-Sleep -Milliseconds 800 } }"
set "COOKIE_SECURE="
node --no-warnings src\server.js
echo.
echo O SERVIDOR foi encerrado, ou houve um erro acima.
if not defined SAL_NOBROWSER pause
