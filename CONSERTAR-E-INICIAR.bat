@echo off
REM ============================================================================
REM  CONSERTAR E INICIAR - SALAMANDRA (Windows)
REM  Use quando der o erro "RuntimeError: Aborted" ou nao abrir de jeito nenhum.
REM   1) Desbloqueia os arquivos (vieram da internet/Drive/pen drive)
REM   2) Apaga a base corrompida desta maquina (recomeca limpa)
REM   3) Inicia com o Node 22 EMBUTIDO desta pasta
REM ============================================================================
setlocal
set "ROOT=%~dp0"

echo ================================================================
echo   CONSERTAR E INICIAR - SALAMANDRA
echo ----------------------------------------------------------------
echo   ATENCAO: isto APAGA os dados locais DESTA maquina.
echo   (A base atual nao abre mesmo; os dados ja estao perdidos.)
echo   Se este PC NAO for o servidor, tudo bem: os dados oficiais
echo   ficam no servidor.
echo ================================================================
set c=
set /p c=Digite SIM (maiusculas) para continuar:
if /I not "%c%"=="SIM" ( echo Cancelado. & pause & exit /b 0 )

echo.
echo [1/3] Desbloqueando os arquivos da pasta...
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%ROOT%' -Recurse -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue" 2>nul

echo [2/3] Removendo a base corrompida...
if exist "%LOCALAPPDATA%\SALAMANDRA\pgdata" rmdir /s /q "%LOCALAPPDATA%\SALAMANDRA\pgdata"

echo [3/3] Iniciando o SALAMANDRA (Node 22 embutido)...
echo.
call "%ROOT%Iniciar-CHQAO.bat"
