@echo off
REM ============================================================================
REM  REMOVE a automacao do SERVIDOR SALAMANDRA (auto-inicio e atualizacao 04:00).
REM  Nao apaga o banco nem o programa. Precisa de ADMINISTRADOR.
REM ============================================================================
net session >nul 2>nul
if errorlevel 1 (
  echo Solicitando permissao de administrador...
  powershell -NoProfile -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)

echo Removendo tarefa de auto-inicio...
schtasks /delete /tn "SALAMANDRA - Servidor (auto-inicio)" /f
echo Removendo tarefa de atualizacao diaria...
schtasks /delete /tn "SALAMANDRA - Atualizar (madrugada)" /f
echo.
echo Automacao removida. O servidor so subira quando voce rodar
echo o "Servidor-CHQAO.bat" manualmente.
echo.
pause
