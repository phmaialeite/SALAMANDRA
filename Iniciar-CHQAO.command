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

# -------------------------------------------------------------------------
# BACKUP DE SEGURANCA: copia a base ANTES de iniciar (mantem as 5 ultimas).
# Se a base corromper, use o "Restaurar-base-SALAMANDRA" para voltar a ultima integra.
# -------------------------------------------------------------------------
if [ -d "$PGLITE_DIR" ] && [ -f "$PGLITE_DIR/PG_VERSION" ]; then
  BK="$HOME/.salamandra/backups"; mkdir -p "$BK"
  rm -rf "$BK/base-5"
  for i in 4 3 2 1; do [ -d "$BK/base-$i" ] && mv "$BK/base-$i" "$BK/base-$((i+1))"; done
  cp -R "$PGLITE_DIR" "$BK/base-1" 2>/dev/null && echo "Backup de seguranca da base atualizado (5 ultimas em ~/.salamandra/backups)."
fi

echo "================================================================"
echo " Plataforma CHQAO BM 2026 - SALAMANDRA iniciando..."
echo " Banco local: $PGLITE_DIR"
echo " AGUARDE: o navegador abre SOZINHO quando o servidor estiver pronto."
echo " Para ENCERRAR: feche esta janela ou pressione Ctrl+C."
echo "================================================================"
# Abre o navegador SOMENTE quando a porta 8088 responder (evita "conexao recusada").
( for i in $(seq 1 60); do
    if (exec 3<>/dev/tcp/127.0.0.1/8088) 2>/dev/null; then exec 3>&-; (open http://127.0.0.1:8088 >/dev/null 2>&1 || xdg-open http://127.0.0.1:8088 >/dev/null 2>&1); break; fi
    sleep 1
  done ) &
node --no-warnings src/server.js
echo ""; echo "O SALAMANDRA foi encerrado, ou houve um erro acima."
read -p "Enter para sair..."
