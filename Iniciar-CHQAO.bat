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

REM Backup de seguranca: copia a base ANTES de iniciar (mantem as 5 ultimas).
set "BK=%LOCALAPPDATA%\SALAMANDRA\backups"
if exist "%PGLITE_DIR%\PG_VERSION" (
  if not exist "%BK%" mkdir "%BK%"
  if exist "%BK%\base-5" rmdir /s /q "%BK%\base-5"
  if exist "%BK%\base-4" move "%BK%\base-4" "%BK%\base-5" >nul
  if exist "%BK%\base-3" move "%BK%\base-3" "%BK%\base-4" >nul
  if exist "%BK%\base-2" move "%BK%\base-2" "%BK%\base-3" >nul
  if exist "%BK%\base-1" move "%BK%\base-1" "%BK%\base-2" >nul
  robocopy "%PGLITE_DIR%" "%BK%\base-1" /E /NFL /NDL /NJH /NJS /NC /NS /NP >nul
  echo Backup de seguranca da base atualizado ^(5 ultimas em %BK%^).
)

echo ================================================================
echo  Plataforma CHQAO BM 2026 - SALAMANDRA iniciando...
echo  Banco local: %PGLITE_DIR%
echo  AGUARDE: o navegador abre SOZINHO quando o servidor estiver pronto.
echo  (Pode levar alguns segundos por causa do backup de seguranca.)
echo  Para ENCERRAR: feche esta janela.
echo ================================================================
REM Abre o navegador SOMENTE quando o servidor responder (evita "conexao recusada").
start "" /min powershell -NoProfile -Command "$u='http://127.0.0.1:8088'; for($i=0;$i -lt 60;$i++){ try{ [void](Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 2); Start-Process $u; break }catch{ Start-Sleep -Milliseconds 800 } }"
node --no-warnings src\server.js
echo.
echo ================================================================
echo  O SALAMANDRA foi encerrado, ou houve um ERRO acima.
echo  Se aparecer um erro em vermelho, tire uma FOTO desta tela.
echo  Se a base corrompeu, rode o "Recriar-base-SALAMANDRA.bat".
echo ================================================================
pause
