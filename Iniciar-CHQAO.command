#!/bin/bash
# Inicia a Plataforma de Governanca CHQAO BM 2026 - SALAMANDRA (macOS / Linux).
# Basta dar dois cliques neste arquivo.
cd "$(dirname "$0")/backend" || exit 1

# -------------------------------------------------------------------------
# BANCO DE DADOS LOCAL (fora da pasta sincronizada no Google Drive).
# Cada maquina guarda o SEU proprio banco aqui. NUNCA deixe o banco dentro
# do Drive: dois computadores gravando o mesmo arquivo corrompem a base.
# -------------------------------------------------------------------------
export PGLITE_DIR="$HOME/.salamandra/pgdata"
mkdir -p "$HOME/.salamandra"

if ! command -v node >/dev/null 2>&1; then
  echo "================================================================"
  echo " Node.js nao encontrado nesta maquina."
  echo " Instale a versao LTS em:  https://nodejs.org"
  echo " Depois, rode este arquivo novamente."
  echo "================================================================"
  read -p "Pressione Enter para sair..."
  exit 1
fi

if [ ! -d "$PGLITE_DIR" ]; then
  echo "Primeira execucao nesta maquina: preparando a base de dados (uma unica vez)..."
  echo "Banco local em: $PGLITE_DIR"
  node --no-warnings src/seed.js || { echo "Falha ao preparar a base."; read -p "Enter para sair..."; exit 1; }
fi

echo "================================================================"
echo " Plataforma CHQAO BM 2026 - SALAMANDRA iniciando..."
echo " Banco local: $PGLITE_DIR"
echo " Abra no navegador:  http://127.0.0.1:8088"
echo " Para ENCERRAR: feche esta janela ou pressione Ctrl+C."
echo "================================================================"
( sleep 2; (open http://127.0.0.1:8088 >/dev/null 2>&1 || xdg-open http://127.0.0.1:8088 >/dev/null 2>&1) ) &
node --no-warnings src/server.js
