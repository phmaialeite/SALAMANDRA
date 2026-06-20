@echo off
REM Recria a base de dados LOCAL desta maquina com o acesso padrao de teste.
REM Use quando ninguem consegue entrar. APAGA os dados locais desta maquina.
cd /d "%~dp0backend"
set "PGLITE_DIR=%LOCALAPPDATA%\SALAMANDRA\pgdata"

echo ================================================================
echo  RECRIAR BASE - SALAMANDRA
echo  Isto APAGA os dados locais DESTA maquina e recria a base com:
echo    - login 0000  / senha 1234  (entrada rapida, perfil Direcao)
echo    - cada pessoa tambem entra com o proprio RE + senha 1234
echo ================================================================
set /p c=Digite SIM (maiusculas) para confirmar:
if /I not "%c%"=="SIM" ( echo Cancelado. & pause & exit /b 0 )

where node >nul 2>nul
if errorlevel 1 ( echo Node.js nao encontrado. Instale em https://nodejs.org. & pause & exit /b 1 )

if exist "%PGLITE_DIR%" rmdir /s /q "%PGLITE_DIR%"
node --no-warnings src\seed.js
if errorlevel 1 ( echo Falha ao recriar a base. & pause & exit /b 1 )
echo.
echo Base recriada. Abra o SALAMANDRA (Iniciar-CHQAO) e entre com 0000 / 1234.
pause
