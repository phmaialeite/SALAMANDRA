# Plataforma de Governança — CHQAO BM 2026 (Turma VIII)

Pacote para rodar a ferramenta em **qualquer computador**, para a fase de testes em sala.

---

## 1. Requisito único: Node.js

> **Importante (franqueza técnica):** esta versão da ferramenta — com login, perfis de
> acesso, ranking, QTS com geração automática, assinaturas, backup, etc. — roda em
> **Node.js**, não em Python. (O servidor antigo em Python era a versão inicial, sem
> essas funções.) Instalar o Node.js é tão simples quanto instalar o Python.

1. Acesse **https://nodejs.org** e instale a versão **LTS** (botão da esquerda).
2. É só seguir o instalador (Avançar → Avançar → Concluir).
3. Pronto. Não é preciso instalar mais nada — todas as dependências da ferramenta já
   estão dentro deste pacote (pasta `backend/node_modules`).

A máquina **não precisa de internet** para a ferramenta funcionar (só para assinar via
gov.br, que é opcional — ver item 6).

---

## 2. Como iniciar

- **Windows:** dê dois cliques em **`Iniciar-CHQAO.bat`**.
- **macOS / Linux:** dê dois cliques em **`Iniciar-CHQAO.command`**.
  - Se o macOS bloquear ("desenvolvedor não identificado"), clique com o botão direito
    no arquivo → **Abrir** → **Abrir**. (Só na primeira vez.)

Uma janela preta abrirá (é o servidor — **deixe-a aberta** enquanto usa a ferramenta) e
o navegador abrirá sozinho em **http://127.0.0.1:8088**. Se não abrir, digite esse
endereço no navegador.

**Para encerrar:** feche a janela preta (ou pressione `Ctrl+C` nela).

---

## 3. Primeiro acesso (login)

A senha inicial de cada pessoa é o seu **RE** (e o sistema pede a troca no 1º acesso).

| Perfil | Usuário | Senha inicial |
|---|---|---|
| **Direção** (Cel Philipe) | `0553-1` | `0553-1` |
| **Coordenação** (Maj Marcio) | `0363-6` | `0363-6` |
| Diretor Adjunto / Coord. Adjunto | `u-002` / `u-004` | `0000` |
| Instrutores (Portaria 598) | número interno (ex.: `u-008`) | `1234` |
| **Educadora Física** (Ten BM Ana) | `u-031` | `1234` |
| Alunos | RE do aluno | o próprio RE |

> **Novidade — aba TAF / TFM:** a Coordenação e a Educadora Física lançam os
> resultados do TAF (diagnóstico e os que valem nota), acompanham a evolução por
> prova e enviam o treino individualizado de cada aluno (o aluno baixa e imprime).
> A nota do TAF será calculada automaticamente quando as tabelas oficiais do CBMRO
> forem cadastradas; até lá, pode ser informada manualmente.

A **Direção** gerencia todos em **Pessoas & Acessos** (cadastrar, editar RE, resetar
senha). Os instrutores entram pelo número interno enquanto o RE não é preenchido.

---

## 4. Onde ficam os dados

Tudo o que for lançado (frequência, notas, FOs, QTS, etc.) fica gravado em disco, na
pasta **`backend/pgdata`** deste pacote. Os dados **não somem** ao fechar.

---

## 5. Levar a ferramenta entre computadores (sala ↔ seu PC) — REGRA DE OURO

Para não perder lançamentos ao mover a ferramenta:

1. **No computador da sala:** entre como Direção → **Pessoas & Acessos** →
   **Exportar backup**. Guarde o arquivo `.json` (pen drive / nuvem).
2. **No seu computador:** abra a ferramenta → **Importar backup** → confirme. Agora seu
   PC tem os dados da sala. Faça os ajustes/testes.
3. **De volta à sala:** copie de volta **apenas os arquivos do programa** (as pastas
   `backend/`, `public/`, `seed/` e os scripts) — **sem** copiar a pasta
   `backend/pgdata` da sala. Assim o programa novo entra e os dados da sala continuam.
4. Se precisar levar dados do seu PC para a sala, **exporte no seu PC e importe na sala**
   (isso substitui os dados da sala pelos do arquivo).

> ⚠️ **Importar substitui TODOS os dados** da máquina de destino. Exporte antes, por
> garantia. Somente a **Direção** pode exportar/importar.

---

## 6. Assinatura gov.br (opcional, precisa de internet)

Gere o PDF (Relatórios ou Assentamentos) — ele será baixado. Depois, no botão
**"Assinar no gov.br"**, a ferramenta abre o **Assinador gov.br** (assinador.iti.br):
entre com a conta gov.br (nível prata/ouro), **envie o PDF, assine e baixe o assinado**.
Funciona em qualquer computador com internet — não exige nuvem.

---

## 7. Problemas comuns

- **"Node.js não encontrado":** instale em https://nodejs.org (LTS) e rode de novo.
- **A porta 8088 está ocupada:** feche outras janelas pretas da ferramenta e tente de novo.
- **Esqueci a senha de alguém:** a Direção reseta em Pessoas & Acessos (volta ao RE).
- **Quero recomeçar do zero:** apague a pasta `backend/pgdata` e inicie novamente
  (cuidado: isso apaga todos os lançamentos — exporte um backup antes).

---

*CHQAO BM 2026 — Turma VIII · CBMRO/CEEI · Plataforma de Governança do Curso.*
