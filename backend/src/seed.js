// Popula o banco com os dados estruturais (equipe, alunos, disciplinas com os
// instrutores da Portaria 598, normativos) e a base operacional LIMPA.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb, initSchema } from "./db.js";
import { hashSenha, senhaInicial, normLogin } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const seed = J(path.join(__dirname, "..", "seed-data.json"));
const base = J(path.join(__dirname, "..", "..", "seed", "base-limpa.json"));

// ----------------------------------------------------------------------------
// ACESSO (rede CBMRO): login = 1º nome (normalizado); senha = RE; troca obrigatória
// no 1º acesso. Diretor tem login e senha próprios (a senha NÃO fica em texto em
// lugar algum — guarda-se apenas o hash abaixo). Sem RE -> senha provisória = 1º nome.
// ----------------------------------------------------------------------------
const DIRETOR_LOGIN = "cel bm maia";
// Hash da senha do Diretor vem de segredos.json (fora do GitHub). Se não existir
// (ex.: alguém clonou só do repositório público), o Diretor entra com o RE e troca
// obrigatoriamente no 1º acesso — nenhuma senha fica em texto/hash no código versionado.
let _segredos = {};
try { _segredos = J(path.join(__dirname, "..", "segredos.json")); } catch { _segredos = {}; }
const temRE = (re) => !!(re && re !== "—" && String(re).trim() !== "");
const primeiroNome = (nome) => normLogin(nome).split(" ")[0] || normLogin(nome);
const _logins = new Set();
function loginUnico(base) {
  base = normLogin(base) || "usuario";
  let cand = base, i = 2;
  while (_logins.has(cand)) cand = base + (i++);
  _logins.add(cand); return cand;
}

async function run() {
  const db = await initSchema();
  const TABS = ["perfis","usuarios","disciplinas","lancamentos_freq","lancamentos_nota",
    "fatos_observados","recursos","normativos","qts_semanas","estado_kv","auditoria"];
  for (const t of TABS) await db.query(`DELETE FROM ${t}`);

  // Usuários (equipe + alunos) e perfis
  for (const p of seed.EQUIPE) {
    let login, senhaHash, provisoria, senhaIniCol;
    if (p.id === "u-001") {                      // Diretor: login e senha próprios (hash vindo de segredos.json)
      login = loginUnico(DIRETOR_LOGIN); senhaIniCol = null;
      if (_segredos.diretorHash) { senhaHash = _segredos.diretorHash; provisoria = false; }
      else { senhaHash = hashSenha(senhaInicial({ senha_inicial: null, re: p.re })); provisoria = true; }  // sem segredos: RE + troca
    } else {
      login = loginUnico(primeiroNome(p.nome));
      const iniPlano = p.senhaInicial ? String(p.senhaInicial) : (temRE(p.re) ? String(p.re).trim() : primeiroNome(p.nome));
      senhaHash = hashSenha(iniPlano); provisoria = true;
      senhaIniCol = temRE(p.re) ? null : iniPlano;   // RE fica implícito; sem RE, expõe a provisória (1º nome) à Direção
    }
    await db.query(
      `INSERT INTO usuarios (id,tipo,login,posto_grad,nome,re,precedencia,cargo,obs,senha_inicial,senha_hash,senha_provisoria,ativo)
       VALUES ($1,'equipe',$2,$3,$4,$5,NULL,$6,$7,$8,$9,$10,TRUE)`,
      [p.id, login, p.postoGrad, p.nome, p.re, p.cargo || null, p.obs || null, senhaIniCol, senhaHash, provisoria]);
    for (const perf of (p.perfis || [])) await db.query(`INSERT INTO perfis (usuario_id,perfil) VALUES ($1,$2)`, [p.id, perf]);
  }
  for (const a of seed.ALUNOS) {                 // aluno: login = 1º nome, senha = RE, troca obrigatória
    const login = loginUnico(primeiroNome(a.nm));
    await db.query(
      `INSERT INTO usuarios (id,tipo,login,posto_grad,nome,re,precedencia,obs,senha_hash,senha_provisoria,ativo)
       VALUES ($1,'aluno',$2,$3,$4,$5,$6,$7,$8,TRUE,TRUE)`,
      [a.id, login, a.postoGrad, a.nm, a.re, a.prec, a.obs || null, hashSenha(senhaInicial({ senha_inicial: null, re: a.re }))]);
    await db.query(`INSERT INTO perfis (usuario_id,perfil) VALUES ($1,'aluno')`, [a.id]);
  }

  // Disciplinas (com instrutor da Portaria 598)
  for (const d of seed.MATRIZ) {
    await db.query(
      `INSERT INTO disciplinas (cod,ord,nucleo,nome,ch,peso,natureza,instrutor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [d.cod, d.ord, d.nucleo, d.nome, d.ch, d.peso ?? null, d.natureza, seed.INSTRUTORES_PADRAO[d.cod] || null]);
  }

  // Cadastro dos INSTRUTORES da Portaria 598 como usuários (perfil instrutor) e
  // vínculo disciplina->instrutor. Os que já são usuários (Direção/Coordenação)
  // são reaproveitados; os demais são criados (RE a preencher pela Direção depois).
  const JA_USUARIO = { "Cel BM Maia": "u-001", "Ten Cel BM Furukawa": "u-002", "Maj BM Márcio": "u-003", "Cap BM Graziele": "u-005" };
  const POSTOS = ["Ten Cel BM", "Cel BM RR", "Cel BM", "Maj BM", "Maj PM", "Cap BM", "1º Ten BM", "Ten BM", "SD BM"];
  const parsePosto = (s) => { for (const pt of POSTOS) if (s.startsWith(pt + " ")) return { postoGrad: pt, nome: s.slice(pt.length + 1) }; return { postoGrad: "", nome: s }; };
  let prox = (await db.query(`SELECT id FROM usuarios WHERE id LIKE 'u-%'`)).rows
    .reduce((mx, r) => Math.max(mx, parseInt((/^u-(\d+)$/.exec(r.id) || [])[1] || 0, 10)), 0) + 1;
  const criados = {};
  for (const d of seed.MATRIZ) {
    const instr = seed.INSTRUTORES_PADRAO[d.cod]; if (!instr) continue;
    let uid = JA_USUARIO[instr] || criados[instr];
    if (!uid) {
      uid = `u-${String(prox++).padStart(3, "0")}`;
      const { postoGrad, nome } = parsePosto(instr);
      const login = loginUnico(primeiroNome(nome));
      const prov = primeiroNome(nome);   // sem RE em cadastro -> senha provisória = 1º nome (troca obrigatória)
      await db.query(`INSERT INTO usuarios (id,tipo,login,posto_grad,nome,re,senha_inicial,senha_hash,senha_provisoria,ativo) VALUES ($1,'equipe',$2,$3,$4,NULL,$5,$6,TRUE,TRUE)`, [uid, login, postoGrad, nome, prov, hashSenha(prov)]);
      await db.query(`INSERT INTO perfis (usuario_id,perfil) VALUES ($1,'instrutor')`, [uid]);
      criados[instr] = uid;
    }
    await db.query(`UPDATE disciplinas SET instrutor_id=$1 WHERE cod=$2`, [uid, d.cod]);
  }
  console.log("Instrutores:", Object.keys(criados).length, "criados +", new Set(Object.values(JA_USUARIO)).size, "já-usuários vinculados");

  // Educadora Física: Ten BM Ana (monitora de TFM na Portaria 598). Perfil educador_fisico.
  {
    const idEF = `u-${String(prox++).padStart(3, "0")}`;
    const loginEF = loginUnico("ana");
    await db.query(`INSERT INTO usuarios (id,tipo,login,posto_grad,nome,re,cargo,senha_inicial,senha_hash,senha_provisoria,ativo) VALUES ($1,'equipe',$2,$3,$4,NULL,$5,$6,$7,TRUE,TRUE)`,
      [idEF, loginEF, "Ten BM", "Ana", "Educadora Física / Monitora de TFM", "ana", hashSenha("ana")]);
    await db.query(`INSERT INTO perfis (usuario_id,perfil) VALUES ($1,'educador_fisico')`, [idEF]);
    console.log("Educadora Física (Ten BM Ana):", idEF);
  }

  // Normativos (blob)
  for (let i = 0; i < seed.NORMATIVOS.length; i++) {
    const n = seed.NORMATIVOS[i];
    await db.query(`INSERT INTO normativos (id,dados) VALUES ($1,$2)`, [n.id || `norm-${i + 1}`, JSON.stringify(n)]);
  }

  // Estado operacional LIMPO (NOTAS/FREQ da base limpa; FOs/recursos/lançamentos vazios)
  await db.query(`INSERT INTO estado_kv (chave,valor) VALUES ('NOTAS',$1)`, [JSON.stringify(base.NOTAS || {})]);
  await db.query(`INSERT INTO estado_kv (chave,valor) VALUES ('FREQ',$1)`, [JSON.stringify(base.FREQ || {})]);
  await db.query(`INSERT INTO estado_kv (chave,valor) VALUES ('SENHAS_STORE',$1)`, [JSON.stringify({})]);

  // QTS oficial das semanas 1–6 (transcrito das Escalas SEI da Turma VIII). Opcional:
  // se o arquivo existir, semeia o Quadro de Trabalho Semanal já preenchido.
  const qtsPath = path.join(__dirname, "..", "..", "seed", "qts.json");
  if (fs.existsSync(qtsPath)) {
    const qts = J(qtsPath);
    for (const k of Object.keys(qts)) await db.query(`INSERT INTO qts_semanas (semana,dados) VALUES ($1,$2)`, [parseInt(k, 10), JSON.stringify(qts[k])]);
    console.log("QTS semeado: semanas", Object.keys(qts).join(", "));
  }

  // ACESSO REAL (rede CBMRO): sem senha "1234" geral e sem conta-mestre "0000".
  // Cada um entra com login = 1º nome e senha = RE (troca obrigatória no 1º acesso);
  // quem não tem RE cadastrado entra com a senha provisória = 1º nome (também troca).
  // O Diretor entra com o login/senha próprios definidos acima.
  await db.query(`DELETE FROM perfis WHERE usuario_id='acesso-0000'`);
  await db.query(`DELETE FROM usuarios WHERE id='acesso-0000' OR re='0000'`);
  console.log("Acesso real: login=1º nome, senha=RE (troca obrigatória). Conta de teste 0000 REMOVIDA.");

  const c = async (t) => (await db.query(`SELECT COUNT(*)::int AS n FROM ${t}`)).rows[0].n;
  console.log("Seed concluído:",
    "usuarios", await c("usuarios"), "| perfis", await c("perfis"),
    "| disciplinas", await c("disciplinas"), "| normativos", await c("normativos"),
    "| estado_kv", await c("estado_kv"));
  await db.close();
}
run().catch((e) => { console.error("Falha no seed:", e); process.exit(1); });
