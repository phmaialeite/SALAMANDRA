#!/bin/bash
# ============================================================================
#  SALAMANDRA - SERVIDOR da rede (Caminho A) - macOS / Linux
#  Roda em UMA maquina; as outras acessam pelo navegador no endereco exibido.
#  Dois cliques neste arquivo (ou: bash Servidor-CHQAO.command).
# ============================================================================
cd "$(dirname "$0")/backend" || exit 1

export PGLITE_DIR="$HOME/.salamandra/pgdata"
mkdir -p "$HOME/.salamandra"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js nao encontrado. Instale a versao 22 LTS em https://nodejs.org"
  read -p "Enter para sair..."; exit 1
fi

# Segredo de sessao persistente (gerado uma vez).
SECFILE="$HOME/.salamandra/cookie-secret"
[ -f "$SECFILE" ] || node -e "require('fs').writeFileSync(process.argv[1], require('crypto').randomBytes(24).toString('hex'))" "$SECFILE"
export COOKIE_SECRET="$(cat "$SECFILE")"

# Primeira vez: cria a base.
if [ ! -d "$PGLITE_DIR" ]; then
  echo "Primeira execucao: preparando a base (uma unica vez)..."
  node --no-warnings src/seed.js || { echo "Falha ao preparar a base."; read -p "Enter..."; exit 1; }
fi

# Backup de seguranca antes de subir (mantem as 5 ultimas).
if [ -f "$PGLITE_DIR/PG_VERSION" ]; then
  BK="$HOME/.salamandra/backups"; mkdir -p "$BK"
  rm -rf "$BK/base-5"
  for i in 4 3 2 1; do [ -d "$BK/base-$i" ] && mv "$BK/base-$i" "$BK/base-$((i+1))"; done
  cp -R "$PGLITE_DIR" "$BK/base-1" 2>/dev/null
fi

# Descobre o IP na rede local.
LANIP=$(node -e "const o=require('os').networkInterfaces();let ip='';for(const k in o)for(const a of o[k])if(a.family==='IPv4'&&!a.internal){if(/^(192\.168\.|10\.|172\.)/.test(a.address)){ip=a.address}else if(!ip){ip=a.address}}console.log(ip||'127.0.0.1')")

echo "================================================================"
echo "   SALAMANDRA - SERVIDOR NO AR"
echo "----------------------------------------------------------------"
echo "   Nos OUTROS aparelhos da rede, abra o navegador em:"
echo ""
echo "         http://$LANIP:8088"
echo ""
echo "   Neste servidor:  http://127.0.0.1:8088   (0000 / 1234)"
echo "   NAO feche esta janela enquanto estiver em uso."
echo "================================================================"

( for i in $(seq 1 60); do
    if (exec 3<>/dev/tcp/127.0.0.1/8088) 2>/dev/null; then exec 3>&-; (open http://127.0.0.1:8088 >/dev/null 2>&1 || xdg-open http://127.0.0.1:8088 >/dev/null 2>&1); break; fi
    sleep 1
  done ) &
node --no-warnings src/server.js
echo ""; echo "O SERVIDOR foi encerrado, ou houve um erro acima."
read -p "Enter para sair..."
