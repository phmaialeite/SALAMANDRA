#!/bin/bash
# Cria um atalho clicavel "SALAMANDRA" na Area de Trabalho (macOS).
# De dois cliques neste arquivo UMA vez.
DIR="$(cd "$(dirname "$0")" && pwd)"
DESK="$HOME/Desktop"

cat > "$DESK/SALAMANDRA.command" <<EOF
#!/bin/bash
cd "$DIR" || exit 1
exec bash "$DIR/Iniciar-CHQAO.command"
EOF
chmod +x "$DESK/SALAMANDRA.command"

echo "Atalho 'SALAMANDRA.command' criado na Area de Trabalho."
echo "Na primeira vez, se o macOS bloquear, clique com o botao direito -> Abrir -> Abrir."
read -r -p "Enter para sair..."
