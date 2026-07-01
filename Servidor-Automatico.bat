@echo off
REM ============================================================================
REM  Execucao AUTOMATICA do servidor (chamado pelo Agendador de Tarefas).
REM  - encerra qualquer servidor anterior (maquina DEDICADA: so ha 1 node)
REM  - busca a versao mais nova e sobe o servidor, SEM abrir navegador
REM  Nao rode a mao no dia a dia; use o "Servidor-CHQAO.bat" para uso normal.
REM ============================================================================
title SALAMANDRA - servidor automatico
set "ROOT=%~dp0"

REM Encerra servidor anterior (se houver). Em maquina dedicada, o unico node e o nosso.
taskkill /IM node.exe /F >nul 2>nul

REM Nao abrir navegador em modo automatico.
set "SAL_NOBROWSER=1"

REM Atualiza (se tiver internet) e sobe o servidor.
call "%ROOT%Atualizar-Servidor.bat"
