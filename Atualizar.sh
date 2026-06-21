#!/usr/bin/env bash
# Atualiza o SALAMANDRA nesta maquina (Linux) a partir do GitHub.
# Use APENAS na maquina que foi configurada com 'git clone'. Uso: bash Atualizar.sh
cd "$(dirname "$0")" || exit 1

if [ ! -d .git ]; then
  echo "Esta pasta nao e um clone do GitHub."
  echo "Use este script so na maquina Linux preparada via 'git clone'."
  read -r -p "Enter para sair..."; exit 1
fi

echo "Buscando atualizacoes do SALAMANDRA (GitHub)..."
if git pull --ff-only; then
  echo "Atualizado com sucesso."
else
  echo "Nao foi possivel atualizar (sem internet, credencial ou alteracoes locais conflitantes)."
  read -r -p "Enter para sair..."; exit 1
fi

# Seguranca: se por algum motivo faltarem dependencias, instala.
if [ ! -d backend/node_modules ] && command -v npm >/dev/null 2>&1; then
  echo "Instalando dependencias..."; ( cd backend && npm install --no-audit --no-fund )
fi

echo ""
echo "Pronto. Para abrir o SALAMANDRA:  bash Iniciar-CHQAO.sh"
read -r -p "Enter para sair..."
