#!/bin/bash
# Cria um APP clicavel "SALAMANDRA" (com icone do brasao) na Area de Trabalho (macOS).
# De dois cliques neste arquivo UMA vez.
DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$HOME/Desktop/SALAMANDRA.app"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$DIR/assets/icone/salamandra.icns" "$APP/Contents/Resources/salamandra.icns" 2>/dev/null

cat > "$APP/Contents/MacOS/run" <<EOF
#!/bin/bash
open "$DIR/Iniciar-CHQAO.command"
EOF
chmod +x "$APP/Contents/MacOS/run"

cat > "$APP/Contents/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>SALAMANDRA</string>
  <key>CFBundleDisplayName</key><string>SALAMANDRA</string>
  <key>CFBundleIdentifier</key><string>br.cbmro.chqao.salamandra</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>run</string>
  <key>CFBundleIconFile</key><string>salamandra.icns</string>
</dict></plist>
EOF

touch "$APP"
echo "App 'SALAMANDRA' (com icone) criado na Area de Trabalho."
echo "Na 1a vez, se o macOS bloquear: botao direito no app -> Abrir -> Abrir."
read -r -p "Enter para sair..."
