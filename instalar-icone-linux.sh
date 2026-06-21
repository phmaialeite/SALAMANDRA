#!/usr/bin/env bash
# Cria um icone clicavel "SALAMANDRA" no Linux (menu de aplicativos + area de trabalho).
# Rode uma vez:  bash instalar-icone-linux.sh
DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$HOME/.local/share/applications"
DESK="$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")"
mkdir -p "$APP"

CONTENT="[Desktop Entry]
Type=Application
Name=SALAMANDRA
Comment=Plataforma CHQAO BM 2026 - Turma VIII
Exec=bash \"$DIR/Sala-iniciar.sh\"
Path=$DIR
Terminal=true
Categories=Education;
"

printf '%s' "$CONTENT" > "$APP/salamandra.desktop"
chmod +x "$APP/salamandra.desktop"

if [ -d "$DESK" ]; then
  printf '%s' "$CONTENT" > "$DESK/SALAMANDRA.desktop"
  chmod +x "$DESK/SALAMANDRA.desktop"
  gio set "$DESK/SALAMANDRA.desktop" metadata::trusted true 2>/dev/null || true
fi

echo "Pronto. Procure o icone 'SALAMANDRA' no menu de aplicativos e na area de trabalho."
echo "(Ao clicar, ele atualiza pelo GitHub e abre. Feche a janela do terminal para encerrar.)"
read -r -p "Enter para sair..."
