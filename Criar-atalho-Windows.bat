@echo off
REM Cria um atalho clicavel "SALAMANDRA" (com icone do brasao) na Area de Trabalho (Windows).
REM De dois cliques neste arquivo UMA vez.
set "TARGET=%~dp0Iniciar-CHQAO.bat"
set "WORK=%~dp0"
set "ICON=%~dp0assets\icone\salamandra.ico"
set "DESK=%USERPROFILE%\Desktop"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$w = New-Object -ComObject WScript.Shell;" ^
  "$s = $w.CreateShortcut('%DESK%\SALAMANDRA.lnk');" ^
  "$s.TargetPath = '%TARGET%';" ^
  "$s.WorkingDirectory = '%WORK%';" ^
  "$s.IconLocation = '%ICON%';" ^
  "$s.Description = 'SALAMANDRA - CHQAO BM 2026';" ^
  "$s.Save()"

echo.
echo Atalho "SALAMANDRA" (com icone) criado na Area de Trabalho.
echo De dois cliques nele para abrir a plataforma.
pause
