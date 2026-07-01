@echo off
REM ============================================================================
REM  ATUALIZAR + INICIAR o SERVIDOR do SALAMANDRA (maquina 24h do quartel).
REM  Busca a versao mais nova no GitHub e ja sobe o servidor.
REM  O BANCO DE DADOS local NAO e alterado.
REM  Use este arquivo quando quiser aplicar uma atualizacao. Para o dia a dia,
REM  se nada mudou, pode usar direto o "Servidor-CHQAO.bat".
REM ============================================================================
title SALAMANDRA - ATUALIZAR + INICIAR SERVIDOR
set "ROOT=%~dp0"

echo ================================================================
echo   ATUALIZAR SERVIDOR SALAMANDRA
echo   1) Busca a versao mais nova (GitHub)
echo   2) Inicia o servidor
echo   O banco de dados NAO e tocado.
echo ================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%atualizar.ps1"

echo.
echo Iniciando o servidor...
echo.
call "%ROOT%Servidor-CHQAO.bat"
