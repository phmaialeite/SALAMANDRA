@echo off
REM ============================================================================
REM  INSTALA a automacao do SERVIDOR SALAMANDRA (maquina 24h do quartel):
REM   1) AUTO-INICIO: sobe o servidor sozinho quando a maquina liga/loga.
REM   2) ATUALIZACAO DE MADRUGADA: todo dia as 04:00 atualiza e reinicia.
REM  Rode UMA VEZ. Precisa de ADMINISTRADOR.
REM  IMPORTANTE: para funcionar apos falta de energia, a maquina precisa
REM  ENTRAR SOZINHA no Windows (login automatico). Veja o LEIA-ME-SERVIDOR.
REM ============================================================================

REM --- Auto-eleva para administrador ---
net session >nul 2>nul
if errorlevel 1 (
  echo Solicitando permissao de administrador...
  powershell -NoProfile -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)

set "ROOT=%~dp0"
set "ALVO=%ROOT%Servidor-Automatico.bat"

echo Criando tarefa 1/2: AUTO-INICIO (ao ligar/logar)...
schtasks /create /tn "SALAMANDRA - Servidor (auto-inicio)" /tr "\"%ALVO%\"" /sc onlogon /f
echo.
echo Criando tarefa 2/2: ATUALIZACAO diaria as 04:00...
schtasks /create /tn "SALAMANDRA - Atualizar (madrugada)" /tr "\"%ALVO%\"" /sc daily /st 04:00 /f

echo.
echo ================================================================
echo  Automacao instalada.
echo   - O servidor subira sozinho quando a maquina ligar.
echo   - Todo dia as 04:00 ele atualiza e reinicia.
echo.
echo  FALTA 1 PASSO MANUAL (uma vez), para sobreviver a falta de luz:
echo  ativar o LOGIN AUTOMATICO do Windows. Passo a passo no
echo  arquivo LEIA-ME-SERVIDOR.txt (secao AUTOMACAO 24h).
echo ================================================================
echo.
echo Deseja iniciar o servidor agora? (fecha em seguida)
set r=
set /p r=Digite S para iniciar agora (Enter para nao):
if /I "%r%"=="S" start "" "%ALVO%"
pause
