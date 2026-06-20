#!/bin/bash
# Salva as alteracoes nos 3 enderecos: copia local (Git), pasta do Drive e GitHub.
cd "/Users/PhilipeMaia/Desktop/Site CHQAO" || exit 1
echo "============================================================"
echo " SALVAR TUDO — SALAMANDRA"
echo " Registra as mudancas e copia para: copia local, Drive e GitHub."
echo "============================================================"
read -r -p "Descreva a mudanca (curto) e Enter: " msg
[ -z "$msg" ] && msg="atualizacao"
git add -A
if git commit -m "$msg"; then
  echo ""
  echo ">> Salvo. (O Drive e o GitHub sao atualizados automaticamente.)"
else
  echo ">> Nada novo para salvar."
fi
read -r -p "Concluido. Enter para sair..."
