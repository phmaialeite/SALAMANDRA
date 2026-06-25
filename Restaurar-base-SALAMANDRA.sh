#!/bin/bash
# Restaura uma cópia de seguranca do banco (use se o SALAMANDRA nao abrir / corromper).
# IMPORTANTE: feche o SALAMANDRA antes de restaurar.
export PGLITE_DIR="$HOME/.salamandra/pgdata"
BK="$HOME/.salamandra/backups"

echo "================================================================"
echo " RESTAURAR BASE — SALAMANDRA"
echo " Copias de seguranca disponiveis (1 = mais recente):"
found=0
for i in 1 2 3 4 5; do
  if [ -d "$BK/base-$i" ]; then found=1; echo "   $i) base-$i   ($(date -r "$BK/base-$i" '+%d/%m/%Y %H:%M' 2>/dev/null))"; fi
done
echo "================================================================"
if [ "$found" = "0" ]; then echo "Nenhuma copia de seguranca encontrada em $BK."; read -r -p "Enter para sair..."; exit 1; fi

read -r -p "Numero da copia a restaurar (Enter = 1): " n
[ -z "$n" ] && n=1
if [ ! -d "$BK/base-$n" ]; then echo "A copia base-$n nao existe."; read -r -p "Enter para sair..."; exit 1; fi

echo "ATENCAO: o banco atual sera SUBSTITUIDO pela copia base-$n."
read -r -p "Digite SIM (maiusculas) para confirmar: " c
[ "$c" = "SIM" ] || { echo "Cancelado."; read -r -p "Enter para sair..."; exit 0; }

rm -rf "$PGLITE_DIR"; mkdir -p "$HOME/.salamandra"
if cp -R "$BK/base-$n" "$PGLITE_DIR"; then echo "Restaurado da copia base-$n. Agora abra o SALAMANDRA normalmente."; else echo "Falha ao restaurar."; fi
read -r -p "Enter para sair..."
