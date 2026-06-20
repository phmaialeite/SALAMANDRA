#!/bin/bash
# Recria a base de dados LOCAL desta maquina com o acesso padrao de teste.
# Use quando ninguem consegue entrar. APAGA os dados locais desta maquina.
cd "$(dirname "$0")/backend" || exit 1
export PGLITE_DIR="$HOME/.salamandra/pgdata"

echo "================================================================"
echo " RECRIAR BASE — SALAMANDRA"
echo " Isto APAGA os dados locais DESTA maquina e recria a base com:"
echo "   - login 0000  / senha 1234  (entrada rapida, perfil Direcao)"
echo "   - cada pessoa tambem entra com o proprio RE + senha 1234"
echo "================================================================"
read -r -p 'Digite SIM (maiusculas) para confirmar: ' c
if [ "$c" != "SIM" ]; then echo "Cancelado."; read -r -p "Enter para sair..."; exit 0; fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js nao encontrado. Instale em https://nodejs.org e tente de novo."
  read -r -p "Enter para sair..."; exit 1
fi

rm -rf "$PGLITE_DIR"
if node --no-warnings src/seed.js; then
  echo ""
  echo "Base recriada com sucesso. Agora abra o SALAMANDRA (Iniciar-CHQAO) e entre com 0000 / 1234."
else
  echo "Falha ao recriar a base."
fi
read -r -p "Enter para sair..."
