@echo off
REM Restaura uma copia de seguranca do banco (use se o SALAMANDRA nao abrir / corromper).
REM IMPORTANTE: feche o SALAMANDRA antes de restaurar.
set "PGLITE_DIR=%LOCALAPPDATA%\SALAMANDRA\pgdata"
set "BK=%LOCALAPPDATA%\SALAMANDRA\backups"
echo ================================================================
echo  RESTAURAR BASE - SALAMANDRA
echo  Copias de seguranca disponiveis (1 = mais recente):
for %%i in (1 2 3 4 5) do if exist "%BK%\base-%%i" echo    %%i^) base-%%i
echo ================================================================
set n=
set /p n=Numero da copia a restaurar (Enter = 1): 
if "%n%"=="" set n=1
if not exist "%BK%\base-%n%" ( echo A copia base-%n% nao existe. & pause & exit /b 1 )
echo ATENCAO: o banco atual sera SUBSTITUIDO pela copia base-%n%.
set c=
set /p c=Digite SIM (maiusculas) para confirmar: 
if /I not "%c%"=="SIM" ( echo Cancelado. & pause & exit /b 0 )
if exist "%PGLITE_DIR%" rmdir /s /q "%PGLITE_DIR%"
robocopy "%BK%\base-%n%" "%PGLITE_DIR%" /E /NFL /NDL /NJH /NJS /NC /NS /NP >nul
echo Restaurado da copia base-%n%. Agora abra o SALAMANDRA normalmente.
pause
