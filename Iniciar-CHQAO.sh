#!/usr/bin/env bash
# Inicia a Plataforma CHQAO BM 2026 - SALAMANDRA (Linux).
# Uso:  abra um terminal nesta pasta e rode:   bash Iniciar-CHQAO.sh
# (ou de dois cliques, escolhendo "Executar no terminal", se o seu sistema permitir).
cd "$(dirname "$0")/backend" || exit 1

# Banco de dados LOCAL desta maquina (fora de qualquer nuvem).
export PGLITE_DIR="$HOME/.salamandra/pgdata"
mkdir -p "$HOME/.salamandra"

if ! command -v node >/dev/null 2>&1; then
  echo "================================================================"
  echo " Node.js nao encontrado nesta maquina."
  echo " Instale o Node.js 18 ou superior. Exemplos:"
  echo "   Debian/Ubuntu:  sudo apt update && sudo apt install -y nodejs npm"
  echo "   Fedora:         sudo dnf install -y nodejs"
  echo "   (versao recente recomendada: https://nodejs.org -> LTS)"
  echo "================================================================"
  read -r -p "Enter para sair..."
  exit 1
fi

NODEV=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null)
if [ -n "$NODEV" ] && [ "$NODEV" -lt 18 ]; then
  echo "Seu Node.js e antigo ($(node -v)). O SALAMANDRA precisa do Node 18 ou superior."
  echo "Atualize o Node e tente de novo."
  read -r -p "Enter para sair..."
  exit 1
fi

if [ ! -d "$PGLITE_DIR" ]; then
  echo "Primeira execucao nesta maquina: preparando a base de dados (uma unica vez)..."
  echo "Banco local em: $PGLITE_DIR"
  node --no-warnings src/seed.js || { echo "Falha ao preparar a base."; read -r -p "Enter para sair..."; exit 1; }
fi

# Backup de seguranca: copia a base ANTES de iniciar (mantem as 5 ultimas).
if [ -d "$PGLITE_DIR" ] && [ -f "$PGLITE_DIR/PG_VERSION" ]; then
  BK="$HOME/.salamandra/backups"; mkdir -p "$BK"
  rm -rf "$BK/base-5"
  for i in 4 3 2 1; do [ -d "$BK/base-$i" ] && mv "$BK/base-$i" "$BK/base-$((i+1))"; done
  cp -R "$PGLITE_DIR" "$BK/base-1" 2>/dev/null && echo "Backup de seguranca da base atualizado (5 ultimas em ~/.salamandra/backups)."
fi

echo "================================================================"
echo " SALAMANDRA iniciando..."
echo " AGUARDE: o navegador abre SOZINHO quando o servidor estiver pronto."
echo " Para ENCERRAR: feche este terminal ou pressione Ctrl+C."
echo "================================================================"
# Abre o navegador SOMENTE quando a porta 8088 responder (evita "conexao recusada").
( for i in $(seq 1 60); do
    if (exec 3<>/dev/tcp/127.0.0.1/8088) 2>/dev/null; then exec 3>&-; xdg-open http://127.0.0.1:8088 >/dev/null 2>&1 || true; break; fi
    sleep 1
  done ) &
node --no-warnings src/server.js
echo ""; echo "O SALAMANDRA foi encerrado, ou houve um erro acima."
read -r -p "Enter para sair..."
