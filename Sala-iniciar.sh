#!/usr/bin/env bash
# ATALHO UNICO DA SALA (Linux): atualiza pelo GitHub e ja abre o SALAMANDRA.
# Uso diario: bash Sala-iniciar.sh   (ou dois cliques -> "Executar no terminal")
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR" || exit 1

echo "================================================================"
echo " SALAMANDRA — atualizando e iniciando..."
echo "================================================================"

if [ -d .git ] && command -v git >/dev/null 2>&1; then
  echo "Buscando atualizacoes (GitHub)..."
  if GIT_TERMINAL_PROMPT=0 git pull --ff-only; then
    echo "Atualizado."
  else
    echo "AVISO: nao foi possivel atualizar (sem internet?). Abrindo a versao que ja esta na maquina."
  fi
else
  echo "(Esta pasta nao e um clone do GitHub — abrindo a versao local.)"
fi

echo ""
# Abre usando o lancador padrao (ja atualizado, se houve pull).
exec bash "$DIR/Iniciar-CHQAO.sh"
