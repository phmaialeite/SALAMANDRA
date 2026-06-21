#!/usr/bin/env bash
# Recria a base de dados LOCAL desta maquina (Linux) com o acesso padrao de teste.
# Use quando ninguem consegue entrar. APAGA os dados locais DESTA maquina.
# Uso:  bash Recriar-base-SALAMANDRA.sh
cd "$(dirname "$0")/backend" || exit 1
export PGLITE_DIR="$HOME/.salamandra/pgdata"

echo "================================================================"
echo " RECRIAR BASE — SALAMANDRA (Linux)"
echo " Isto APAGA os dados locais DESTA maquina e recria a base com:"
echo "   - login 0000  / senha 1234  (entrada rapida, perfil Direcao)"
echo "   - cada pessoa tambem entra com o proprio RE + senha 1234"
echo "================================================================"
read -r -p 'Digite SIM (maiusculas) para confirmar: ' c
if [ "$c" != "SIM" ]; then echo "Cancelado."; read -r -p "Enter para sair..."; exit 0; fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js nao encontrado. Instale (ex.: sudo apt install -y nodejs npm) e tente de novo."
  read -r -p "Enter para sair..."; exit 1
fi

rm -rf "$PGLITE_DIR"
if node --no-warnings src/seed.js; then
  echo ""
  echo "Base recriada. Agora rode  bash Iniciar-CHQAO.sh  e entre com 0000 / 1234."
else
  echo "Falha ao recriar a base."
fi
read -r -p "Enter para sair..."
