# GUIA RÁPIDO — SALAMANDRA (CHQAO BM 2026, Turma VIII)

> Plataforma de governança do curso. Uso interno da coordenação.

## Acesso (vale para todos)
- **Login:** `0000`  **Senha:** `1234`  (entra como Direção)
- Cada pessoa também entra com o **próprio RE** + senha `1234`.
- A plataforma abre no navegador em **http://127.0.0.1:8088**
- **Para encerrar:** feche a janela preta (terminal) que abre junto.

---

## 1) USUÁRIOS — WINDOWS

**Primeira vez (uma só vez):**
1. Instalar o **Node.js** (versão LTS) de https://nodejs.org
2. Ter a pasta **SALAMANDRA** no computador (pelo Google Drive para Desktop, ou baixando de drive.google.com).
3. Entrar na pasta e dar **dois cliques** em **`Criar-atalho-Windows.bat`** → cria o ícone **SALAMANDRA** na Área de Trabalho.

**No dia a dia:**
- **Dois cliques** no ícone **SALAMANDRA** → abre no navegador → login `0000` / `1234`.
- As melhorias chegam **sozinhas pelo Google Drive**. Para pegar a versão nova: feche e abra de novo.

---

## 2) USUÁRIOS — LINUX (máquina da sala)

**Primeira vez (uma só vez), no Terminal:**
1. Instalar Node.js 18+ e git:
   ```
   sudo apt update && sudo apt install -y git
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt install -y nodejs
   ```
2. Guardar o login do GitHub e clonar (peça o **token de leitura** à Direção):
   ```
   git config --global credential.helper store
   git clone https://github.com/phmaialeite/SALAMANDRA.git
   ```
   (Usuário: `phmaialeite` · Senha: cole o **token**.)
3. Criar o ícone:
   ```
   cd SALAMANDRA
   bash instalar-icone-linux.sh
   ```

**No dia a dia:**
- Clique no ícone **SALAMANDRA** (ou rode `bash Sala-iniciar.sh`).
- Ele **atualiza pelo GitHub e abre** automaticamente. Sem internet, abre a versão que já está na máquina.

---

## 3) MEMENTO DA DIREÇÃO (no Mac)

**Onde fica cada coisa:**
| Cópia | Local | Para quê |
|---|---|---|
| Fonte + histórico | `~/Desktop/Site CHQAO` (Git) | onde as mudanças são feitas e versionadas |
| Espelho / uso | Google Drive → `Meu Drive/SALAMANDRA` | roda e sincroniza p/ Windows |
| Backup externo | GitHub privado `phmaialeite/SALAMANDRA` | segurança fora da máquina; atualiza o Linux |
| Banco de dados | `~/.salamandra` (cada máquina) | dados locais — **nunca** vão para a nuvem |

**Abrir o SALAMANDRA:** ícone **SALAMANDRA** na Área de Trabalho.

**Salvar uma melhoria nos 3 lugares de uma vez:**
- Dois cliques em **`Salvar-tudo.command`** → descreva a mudança → ele copia para a **cópia local**, o **Drive** e o **GitHub** sozinho.
- (Quando o desenvolvedor faz a mudança, isso já acontece automaticamente a cada ajuste.)

**Ver as observações lançadas na sala (sem perder seus dados):**
1. Na sala: *Pessoas & Acessos → Exportar backup* → salvar na subpasta **`_backups/`** do Drive.
2. No seu Mac, o arquivo aparece sozinho. Abra em *Pessoas & Acessos → **Abrir backup (somente leitura)*** e selecione o `.json`.

**Quando ninguém consegue entrar (reset de acesso):**
- Rode o **`Recriar-base-SALAMANDRA`** (`.command` no Mac, `.bat` no Windows, `.sh` no Linux). Ele recria a base com `0000`/`1234`. *Atenção: apaga os dados locais daquela máquina.*

---

## Regras de ouro
- O **banco fica local** em cada máquina; **nunca** colocar `pgdata` no Drive (corrompe).
- **Só o Mac da Direção edita** a ferramenta; sala e Windows apenas usam (evita arquivos em conflito).
- **Internet** só é necessária para baixar/atualizar; depois roda **offline**.

## Problemas comuns
- *Não consigo entrar* → use `0000` / `1234`. Se persistir, rode **Recriar-base**.
- *A sala não atualizou* → `bash Atualizar.sh` (precisa de internet).
- *O Mac bloqueou o app ("desenvolvedor não identificado")* → botão direito no app → **Abrir → Abrir** (só na 1ª vez).
