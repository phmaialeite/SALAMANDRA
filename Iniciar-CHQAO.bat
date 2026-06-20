@echo off
REM Inicia a Plataforma de Governanca CHQAO BM 2026 - SALAMANDRA (Windows).
REM Basta dar dois cliques neste arquivo.
cd /d "%~dp0backend"

REM -----------------------------------------------------------------------
REM BANCO DE DADOS LOCAL (fora da pasta sincronizada no Google Drive).
REM Cada maquina guarda o SEU proprio banco aqui. NUNCA deixe o banco dentro
REM do Drive: dois computadores gravando o mesmo arquivo corrompem a base.
REM -----------------------------------------------------------------------
set "PGLITE_DIR=%LOCALAPPDATA%\SALAMANDRA\pgdata"
if not exist "%LOCALAPPDATA%\SALAMANDRA" mkdir "%LOCALAPPDATA%\SALAMANDRA"

where node >nul 2>nul
if errorlevel 1 (
  echo ================================================================
  echo  Node.js nao encontrado nesta maquina.
  echo  Instale a versao LTS em:  https://nodejs.org
  echo  Depois, rode este arquivo novamente.
  echo ================================================================
  pause
  exit /b 1
)

if not exist "%PGLITE_DIR%" (
  echo Primeira execucao nesta maquina: preparando a base de dados ^(uma unica vez^)...
  echo Banco local em: %PGLITE_DIR%
  node --no-warnings src\seed.js
  if errorlevel 1 ( echo Falha ao preparar a base. & pause & exit /b 1 )
)

echo ================================================================
echo  Plataforma CHQAO BM 2026 - SALAMANDRA iniciando...
echo  Banco local: %PGLITE_DIR%
echo  Abra no navegador:  http://127.0.0.1:8088
echo  Para ENCERRAR: feche esta janela ou pressione Ctrl+C.
echo ================================================================
start "" http://127.0.0.1:8088
node --no-warnings src\server.js
