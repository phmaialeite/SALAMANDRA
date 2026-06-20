# SALAMANDRA no Google Drive — guia de espelhamento

Este guia configura a pasta do SALAMANDRA como uma **pasta-espelho** no Google
Drive da coordenação. Objetivo: cada melhoria feita no Mac da Direção chega
sozinha à máquina da sala, e as observações da sala voltam ao Mac **sem USB**.

---

## O que o espelho faz (e o que NÃO faz)

✅ **Leva as MELHORIAS do Mac → sala automaticamente.** Quando o desenvolvedor
   atualiza a ferramenta no Mac, os arquivos sobem ao Drive e descem na sala.

⚠️ **NÃO traz as observações da sala sozinho.** As observações dos colaboradores
   são **dados** gravados no banco da máquina da sala. Elas voltam ao Mac na forma
   de **backup** (ver "Fluxo das observações" abaixo). Continua sendo um clique na
   sala, mas sem transporte físico.

🔒 **REGRA DE OURO:** o **banco de dados nunca entra no Drive**. Os iniciadores já
   guardam o banco LOCAL em cada máquina (`~/.salamandra` no Mac /
   `%LOCALAPPDATA%\SALAMANDRA` no Windows). Se dois computadores sincronizassem o
   mesmo banco pelo Drive, a base corromperia.

A sincronização **automática e em tempo real dos dados** só virá com a nuvem de
verdade (próxima fase). O Drive espelha *arquivos*, não um banco multiusuário.

---

## Passo 1 — Instalar o Google Drive para Desktop (no Mac da Direção)

1. Baixar em: https://www.google.com/drive/download/ (opção "Para computador").
2. Instalar e entrar com a **conta da coordenação do curso**.
3. Quando perguntar o modo da pasta, escolher **"Espelhar" (Mirror)** — mantém uma
   cópia local completa. **Não** usar "Transmitir/Stream" (deixaria os arquivos só
   na nuvem, e a ferramenta precisa deles no disco para rodar).

## Passo 2 — Colocar a pasta SALAMANDRA no Drive

1. Mover a pasta `CHQAO-BM-2026-SALAMANDRA` para dentro de **"Meu Drive"** (ou de
   um **Drive compartilhado** da coordenação, se preferir compartilhar com a equipe).
2. Aguardar o Drive terminar de subir (≈47 MB; a maior parte é a pasta `node_modules`,
   que sobe uma vez e quase não muda).

## Passo 3 — Na(s) máquina(s) da sala

1. Instalar o Google Drive para Desktop e entrar com a mesma conta (ou conta com
   acesso ao Drive compartilhado), em modo **"Espelhar"**.
2. A pasta aparecerá no computador da sala. Rodar o `Iniciar-CHQAO.command` (Mac) ou
   `Iniciar-CHQAO.bat` (Windows) de dentro dela.
3. O banco será criado **local** automaticamente — cada máquina tem o seu.

> **Migração (só se a sala JÁ vinha usando o SALAMANDRA com dados a preservar):**
> antes do primeiro uso da versão nova, mova a pasta de banco antiga
> `backend/pgdata` para o novo local:
> - **Mac:** para `~/.salamandra/pgdata`
> - **Windows:** para `%LOCALAPPDATA%\SALAMANDRA\pgdata`
> Se não houver nada a preservar, ignore: a base nova já abre com o QTS das
> semanas 1–6 preenchido.

---

## Fluxo das observações (sala → Mac, sem USB)

Semanalmente (ou quando a Direção pedir), na **máquina da sala**:
1. Abrir o SALAMANDRA como Direção/Coordenação.
2. `Pessoas & Acessos` → **Exportar backup**.
3. Salvar o `.json` dentro da subpasta **`_backups/`** da pasta do Drive.

O Drive sincroniza e o arquivo aparece no Mac da Direção. As observações da aba
**"Reportar / Melhorias"** podem ser lidas direto desse arquivo.

---

## Regras para evitar problemas

- **Só o Mac da Direção edita o código/ferramenta.** A sala apenas usa. Isso evita
  "arquivos em conflito" criados pelo Drive.
- **Nunca** arraste a pasta de banco (`pgdata`) para dentro do Drive.
- Ao receber uma atualização na sala, **feche e reabra** o SALAMANDRA para carregar
  a versão nova.
- Não apague a pasta `node_modules` (a ferramenta não roda sem ela e ela permite
  uso **sem internet**).
