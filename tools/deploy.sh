#!/bin/bash
# Propaga o estado atual para os outros enderecos: pasta do Drive (espelho da sala)
# e GitHub (backup externo). Chamado automaticamente apos cada commit (post-commit).
REPO="/Users/PhilipeMaia/Desktop/Site CHQAO"
DRIVE="/Users/PhilipeMaia/Library/CloudStorage/GoogleDrive-chqaobm2026@gmail.com/Meu Drive/SALAMANDRA"

# 1) Espelho para o Drive (sem .git, sem dados/banco; preserva os _backups da sala)
if [ -d "$DRIVE" ]; then
  rsync -a --delete \
    --exclude '.git' --exclude '.gitignore' --exclude '.claude' \
    --exclude 'tools' --exclude 'Salvar-tudo.command' \
    --exclude '_backups' --exclude 'pgdata' --exclude 'backend/pgdata' \
    --exclude '.DS_Store' --exclude '.tmp.drive*' \
    "$REPO"/ "$DRIVE"/ && echo "[deploy] Drive (sala) atualizado." || echo "[deploy] AVISO: falha ao espelhar no Drive."
else
  echo "[deploy] AVISO: pasta do Drive nao encontrada; espelho pulado."
fi

# 2) Backup externo no GitHub (se o remoto ja estiver configurado)
if git -C "$REPO" remote get-url origin >/dev/null 2>&1; then
  if git -C "$REPO" push -q origin HEAD 2>/dev/null; then echo "[deploy] GitHub atualizado."; else echo "[deploy] AVISO: push ao GitHub falhou (sem internet?)."; fi
else
  echo "[deploy] (GitHub ainda nao configurado — sera incluido apos a autenticacao)"
fi
