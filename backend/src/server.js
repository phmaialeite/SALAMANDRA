// Backend Fastify — Fase 2b (autenticação + RBAC + escrita granular).
// Login (scrypt) + sessão por cookie httpOnly. Autorização por perfil e por
// PROPRIEDADE: instrutor lança/exclui na sua disciplina; aluno protocola recurso
// e apresenta defesa só dele; tramitação por perfil. Notas/frequência são
// derivadas no servidor (o aluno vê as suas sem expor lançamentos de terceiros).
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getDb, initSchema } from "./db.js";
import { hashSenha, verificaSenha, senhaInicial, normLogin } from "./auth.js";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "public");

const TOTAL_HA = 1638;
const j = (v) => (v == null ? null : JSON.stringify(v));
const p = (v) => { if (v == null) return null; if (typeof v === "object") return v; try { return JSON.parse(v); } catch { return v; } };
const bool = (v) => v === true || v === 1 || v === "t" || v === "true";

const COOKIE_SECRET = process.env.COOKIE_SECRET || "chqao-dev-secret-trocar-em-producao";
if (!process.env.COOKIE_SECRET) console.warn("[aviso] COOKIE_SECRET não definido — segredo de desenvolvimento.");

const app = Fastify({ bodyLimit: 8 * 1024 * 1024 });
await app.register(cors, { origin: true, credentials: true });
await app.register(cookie, { secret: COOKIE_SECRET });

// ----------------- utilidades -----------------
function stamp() { const d = new Date(); const z = (n) => String(n).padStart(2, "0"); return `${z(d.getDate())}/${z(d.getMonth() + 1)} ${z(d.getHours())}:${z(d.getMinutes())}`; }
const ator = (req) => `${req.usuario.postoGrad || ""} ${req.usuario.nome} (${req.usuario.perfis[0] || ""})`.trim();
const temPerfil = (req, ...ps) => req.usuario && req.usuario.perfis.some((x) => ps.includes(x));

async function audit(db, uid, acao, ent = null, rid = null, det = null) {
  try { await db.query(`INSERT INTO auditoria (em,usuario_id,acao,entidade,registro_id,detalhe) VALUES ($1,$2,$3,$4,$5,$6)`, [new Date().toISOString(), uid, acao, ent, rid, det]); } catch {}
}
async function nextId(db, table, prefix, pad) {
  const rows = (await db.query(`SELECT id FROM ${table}`)).rows;
  let max = 0; for (const r of rows) { const m = /(\d+)\s*$/.exec(r.id); if (m) max = Math.max(max, parseInt(m[1], 10)); }
  return prefix + String(max + 1).padStart(pad, "0");
}
async function nextUsuarioId(db, ehAluno) {
  const rows = (await db.query(`SELECT id FROM usuarios WHERE tipo=$1`, [ehAluno ? "aluno" : "equipe"])).rows;
  let max = 0; const re = ehAluno ? /^a(\d+)$/ : /^u-(\d+)$/;
  for (const r of rows) { const m = re.exec(r.id); if (m) max = Math.max(max, parseInt(m[1], 10)); }
  return ehAluno ? `a${max + 1}` : `u-${String(max + 1).padStart(3, "0")}`;
}
// direção/coordenação podem tudo; instrutor/monitor só na disciplina vinculada
async function podeLancarDisc(db, req, disc) {
  if (temPerfil(req, "direcao", "coordenacao")) return true;
  if (temPerfil(req, "instrutor", "monitor"))
    return !!(await db.query(`SELECT 1 FROM disciplinas WHERE cod=$1 AND instrutor_id=$2`, [disc, req.usuario.id])).rows[0];
  return false;
}
async function carregaUsuario(db, uid) {
  const u = (await db.query(`SELECT * FROM usuarios WHERE id=$1 AND ativo=TRUE`, [uid])).rows[0];
  if (!u) return null;
  const perfis = (await db.query(`SELECT perfil FROM perfis WHERE usuario_id=$1`, [uid])).rows.map((r) => r.perfil);
  return { id: u.id, tipo: u.tipo, nome: u.nome, re: u.re, postoGrad: u.posto_grad, perfis, senhaProvisoria: bool(u.senha_provisoria) };
}
function setSessao(reply, uid) {
  reply.setCookie("sessao", uid, { signed: true, httpOnly: true, sameSite: "lax", path: "/", secure: !!process.env.COOKIE_SECURE, maxAge: 60 * 60 * 8 });
}
// notas e frequência derivadas dos lançamentos
async function computar(db) {
  const alunos = (await db.query(`SELECT id FROM usuarios WHERE tipo='aluno'`)).rows.map((r) => r.id);
  const disc = (await db.query(`SELECT cod,ch FROM disciplinas`)).rows;
  const lf = (await db.query(`SELECT disc,faltas FROM lancamentos_freq`)).rows.map((r) => ({ disc: r.disc, faltas: p(r.faltas) || {} }));
  const ln = (await db.query(`SELECT disc,notas FROM lancamentos_nota ORDER BY id`)).rows.map((r) => ({ disc: r.disc, notas: p(r.notas) || {} }));
  const NOTAS = {}, FREQ = {};
  for (const a of alunos) {
    NOTAS[a] = {}; FREQ[a] = {}; let tot = 0;
    for (const d of disc) {
      let s = 0; for (const e of lf) if (e.disc === d.cod) s += e.faltas[a] || 0;
      FREQ[a][d.cod] = d.ch ? Math.round((s / d.ch) * 100) : 0; tot += s;
      let v = null; for (const e of ln) if (e.disc === d.cod && e.notas[a] != null) v = e.notas[a];
      NOTAS[a][d.cod] = v;
    }
    FREQ[a].total = Math.round((tot / TOTAL_HA) * 100);
  }
  return { NOTAS, FREQ };
}

// ----------------- autenticação -----------------
app.addHook("preHandler", async (req, reply) => {
  if (req.routeOptions?.config?.public || req.method === "OPTIONS") return;
  const raw = req.cookies?.sessao;
  const un = raw ? req.unsignCookie(raw) : { valid: false };
  if (!un.valid) return reply.code(401).send({ erro: "não autenticado" });
  const u = await carregaUsuario(await getDb(), un.value);
  if (!u) return reply.code(401).send({ erro: "sessão inválida" });
  req.usuario = u;
});

app.get("/api/health", { config: { public: true } }, async () => ({ ok: true, db: (await getDb()).tipo }));

// ----------------- SPA (Fase 2c) servido na mesma origem do backend -----------------
// A página é pública (o login é por dentro da própria SPA); os dados continuam
// protegidos pela sessão. Sem __STATE__: a SPA hidrata via GET /api/estado.
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
async function enviaSpa(reply) {
  let html = await readFile(path.join(PUBLIC_DIR, "app-online.html"), "utf8");
  const tag = "<script>window.__API__='/api';window.__ONLINE__=true;</script>";
  html = html.includes("</head>") ? html.replace("</head>", tag + "\n</head>") : tag + html;
  // Anti-cache: garante que o navegador sempre carregue a versão mais nova após uma atualização.
  reply.header("Cache-Control", "no-store, no-cache, must-revalidate");
  reply.header("Pragma", "no-cache");
  reply.header("Expires", "0");
  return reply.type("text/html; charset=utf-8").send(html);
}
app.get("/", { config: { public: true } }, async (req, reply) => enviaSpa(reply));
app.get("/app-online.html", { config: { public: true } }, async (req, reply) => enviaSpa(reply));
app.get("/vendor/:arquivo", { config: { public: true } }, async (req, reply) => {
  const nome = path.basename(req.params.arquivo);          // impede traversal
  try {
    const buf = await readFile(path.join(PUBLIC_DIR, "vendor", nome));
    return reply.type(TIPOS[path.extname(nome)] || "application/octet-stream").send(buf);
  } catch { return reply.code(404).send("não encontrado"); }
});

app.post("/api/login", { config: { public: true } }, async (req, reply) => {
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha) return reply.code(400).send({ erro: "informe usuário e senha" });
  const db = await getDb();
  const raw = String(usuario).trim();
  // Login por 1º nome (normalizado: sem acento/caixa) — ou, por conveniência, RE ou id.
  const u = (await db.query(`SELECT * FROM usuarios WHERE (login=$1 OR re=$2 OR id=$2) AND ativo=TRUE LIMIT 1`, [normLogin(raw), raw])).rows[0];
  if (!u || !verificaSenha(senha, u.senha_hash)) { await audit(db, (u && u.id) || null, "login_falha", "usuario", String(usuario)); return reply.code(401).send({ erro: "usuário ou senha inválidos" }); }
  setSessao(reply, u.id); await audit(db, u.id, "login");
  return await carregaUsuario(db, u.id);
});
app.post("/api/logout", async (req, reply) => { reply.clearCookie("sessao", { path: "/" }); return { ok: true }; });
app.get("/api/me", async (req) => req.usuario);
app.post("/api/trocar-senha", async (req, reply) => {
  const { atual, nova } = req.body || {}; const db = await getDb();
  const u = (await db.query(`SELECT * FROM usuarios WHERE id=$1`, [req.usuario.id])).rows[0];
  if (!verificaSenha(atual, u.senha_hash)) return reply.code(400).send({ erro: "senha atual incorreta" });
  if (!nova || String(nova).length < 6) return reply.code(400).send({ erro: "a nova senha deve ter ao menos 6 caracteres" });
  if (String(nova) === senhaInicial(u)) return reply.code(400).send({ erro: "a nova senha não pode ser igual à inicial" });
  await db.query(`UPDATE usuarios SET senha_hash=$1, senha_provisoria=FALSE WHERE id=$2`, [hashSenha(String(nova)), u.id]);
  await audit(db, u.id, "trocar_senha"); return { ok: true };
});

// ----------------- estado -----------------
async function montarEstado(db) {
  const us = (await db.query("SELECT * FROM usuarios ORDER BY tipo, precedencia NULLS LAST, id")).rows;
  const pf = (await db.query("SELECT * FROM perfis")).rows;
  const perfDe = (id) => pf.filter((x) => x.usuario_id === id).map((x) => x.perfil);
  const EQUIPE = us.filter((u) => u.tipo === "equipe").map((u) => ({ id: u.id, login: u.login || "", postoGrad: u.posto_grad, nome: u.nome, re: u.re, perfis: perfDe(u.id), cargo: u.cargo || "", obs: u.obs || "", nascimento: u.nascimento || "", sexo: u.sexo || "", ...(u.senha_inicial ? { senhaInicial: u.senha_inicial } : {}) }));
  const ALUNOS = us.filter((u) => u.tipo === "aluno").map((u) => ({ id: u.id, login: u.login || "", postoGrad: u.posto_grad, nm: u.nome, re: u.re, prec: u.precedencia, obs: u.obs || "", nascimento: u.nascimento || "", sexo: u.sexo || "" }));
  const MATRIZ = (await db.query("SELECT * FROM disciplinas ORDER BY ord")).rows.map((d) => ({ cod: d.cod, ord: d.ord, nucleo: d.nucleo, nome: d.nome, ch: d.ch, peso: d.peso, natureza: d.natureza, instrutor: d.instrutor, instrutorId: d.instrutor_id }));
  const FREQ_LANC = (await db.query("SELECT * FROM lancamentos_freq")).rows.map((r) => ({ id: r.id, data: r.data, disc: r.disc, ha: r.ha, faltas: p(r.faltas) || {}, autor: r.autor, registradoEm: r.registrado_em }));
  const NOTAS_LANC = (await db.query("SELECT * FROM lancamentos_nota")).rows.map((r) => ({ id: r.id, disc: r.disc, avaliacao: r.avaliacao, notas: p(r.notas) || {}, autor: r.autor, registradoEm: r.registrado_em }));
  const FOS = (await db.query("SELECT * FROM fatos_observados")).rows.map((r) => ({ id: r.id, tipo: r.tipo, aluno: r.aluno, ctx: r.ctx, desc: r.descricao, disp: r.disp, estado: r.estado, orig: r.orig, origNm: r.orig_nm, trilha: p(r.trilha) || [] }));
  const RECURSOS = (await db.query("SELECT * FROM recursos")).rows.map((r) => ({ id: r.id, aluno: r.aluno, disc: r.disc, aval: r.aval, notaOrig: r.nota_orig, notaSolicitada: r.nota_solicitada, justAluno: r.just_aluno, dataAbertura: r.data_abertura, estado: r.estado, respostaInst: p(r.resposta_inst), motivoEscalada: r.motivo_escalada, dataEscalada: r.data_escalada, decisao: p(r.decisao), trilha: p(r.trilha) || [] }));
  const NORMATIVOS = (await db.query("SELECT * FROM normativos")).rows.map((r) => p(r.dados));
  const QTS_CACHE = Object.fromEntries((await db.query("SELECT * FROM qts_semanas")).rows.map((r) => [String(r.semana), p(r.dados)]));
  const { NOTAS, FREQ } = await computar(db);
  return { EQUIPE, ALUNOS, MATRIZ, NOTAS, FREQ, FREQ_LANC, NOTAS_LANC, FOS, RECURSOS, NORMATIVOS, QTS_CACHE };
}

app.get("/api/estado", async (req) => {
  const full = await montarEstado(await getDb());
  const u = req.usuario;
  if (u.perfis.includes("direcao") || u.perfis.includes("coordenacao")) return full;
  if (u.tipo === "aluno") {
    const m = u.id;
    return { EQUIPE: full.EQUIPE, MATRIZ: full.MATRIZ, NORMATIVOS: full.NORMATIVOS, QTS_CACHE: full.QTS_CACHE,
      ALUNOS: full.ALUNOS.filter((a) => a.id === m), NOTAS: { [m]: full.NOTAS[m] || {} }, FREQ: { [m]: full.FREQ[m] || {} },
      FREQ_LANC: [], NOTAS_LANC: [], FOS: full.FOS.filter((f) => f.aluno === m), RECURSOS: full.RECURSOS.filter((r) => r.aluno === m) };
  }
  // instrutor: sem acesso a notas nem recursos (atua apenas em FOs e frequências)
  if (u.perfis.includes("instrutor")) return { ...full, NOTAS: {}, NOTAS_LANC: [], RECURSOS: [] };
  return full; // monitor / auxiliar
});

// ----------------- ranking (todos os usuários) — classificação SEM expor notas -----------------
app.get("/api/ranking", async (req) => {
  const db = await getDb();
  const { NOTAS } = await computar(db);
  const disc = (await db.query("SELECT cod,peso FROM disciplinas")).rows;
  const alunos = (await db.query("SELECT id,nome,posto_grad,re,precedencia FROM usuarios WHERE tipo='aluno'")).rows;
  const media = (aid) => { let num = 0, den = 0; for (const d of disc) { const n = (NOTAS[aid] || {})[d.cod]; if (n != null) { const peso = d.peso || 0; num += n * peso; den += peso; } } return den ? num / den : null; };
  const arr = alunos.map((a) => ({ id: a.id, nome: a.nome, postoGrad: a.posto_grad, re: a.re, prec: a.precedencia, m: media(a.id) }));
  arr.sort((x, y) => ((y.m == null ? -1 : y.m) - (x.m == null ? -1 : x.m)) || ((x.prec || 999) - (y.prec || 999)));
  const ordenado = arr.map((x, i) => ({ pos: i + 1, id: x.id, nome: x.nome, postoGrad: x.postoGrad, re: x.re, comNota: x.m != null }));
  const iniciado = arr.some((x) => x.m != null);
  // liderança: registra desde quando o 1º colocado (com nota) assumiu a ponta — sem expor notas
  let lider = null; const top = arr.find((x) => x.m != null);
  if (top) {
    const row = (await db.query("SELECT valor FROM estado_kv WHERE chave='LIDERANCA'")).rows[0];
    const cur = row ? p(row.valor) : null;
    let desde;
    if (cur && cur.id === top.id) desde = cur.desde;
    else { desde = new Date().toISOString(); await db.query("INSERT INTO estado_kv (chave,valor) VALUES ('LIDERANCA',$1) ON CONFLICT (chave) DO UPDATE SET valor=$1", [j({ id: top.id, desde })]); }
    const dias = Math.max(0, Math.floor((new Date().getTime() - new Date(desde).getTime()) / 86400000));
    lider = { id: top.id, nome: top.nome, postoGrad: top.postoGrad, re: top.re, desde, diasNaLideranca: dias };
  }
  return { iniciado, fimCurso: "2026-12-04T10:00:00", lider, ordenado };
});

// ----------------- lançamentos (instrutor/coordenação/direção) -----------------
app.post("/api/lancamento-freq", async (req, reply) => {
  const { data, disc, ha, faltas } = req.body || {}; const db = await getDb();
  if (!disc || !data) return reply.code(400).send({ erro: "data e disciplina obrigatórias" });
  if (!(await podeLancarDisc(db, req, disc))) return reply.code(403).send({ erro: "sem permissão para esta disciplina" });
  const id = await nextId(db, "lancamentos_freq", "FL-", 4);
  await db.query(`INSERT INTO lancamentos_freq (id,data,disc,ha,faltas,autor,registrado_em) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id, data, disc, ha ?? 0, j(faltas || {}), ator(req), stamp()]);
  await audit(db, req.usuario.id, "lancar_freq", "disciplina", disc); return { ok: true, id };
});
app.delete("/api/lancamento-freq/:id", async (req, reply) => {
  const db = await getDb(); const e = (await db.query(`SELECT * FROM lancamentos_freq WHERE id=$1`, [req.params.id])).rows[0];
  if (!e) return reply.code(404).send({ erro: "não encontrado" });
  if (!temPerfil(req, "direcao", "coordenacao")) return reply.code(403).send({ erro: "apenas Direção/Coordenação podem excluir" });
  await db.query(`DELETE FROM lancamentos_freq WHERE id=$1`, [req.params.id]); await audit(db, req.usuario.id, "excluir_freq", "lancamento_freq", req.params.id); return { ok: true };
});
app.put("/api/lancamento-freq/:id", async (req, reply) => {
  const db = await getDb(); const e = (await db.query(`SELECT * FROM lancamentos_freq WHERE id=$1`, [req.params.id])).rows[0];
  if (!e) return reply.code(404).send({ erro: "não encontrado" });
  if (!temPerfil(req, "direcao", "coordenacao")) return reply.code(403).send({ erro: "apenas Direção/Coordenação podem corrigir frequências" });
  const { data, disc, ha, faltas } = req.body || {};
  await db.query(`UPDATE lancamentos_freq SET data=COALESCE($1,data), disc=COALESCE($2,disc), ha=COALESCE($3,ha), faltas=COALESCE($4,faltas), autor=$5, registrado_em=$6 WHERE id=$7`,
    [data ?? null, disc ?? null, ha ?? null, faltas ? j(faltas) : null, `${ator(req)} (correção)`, stamp(), e.id]);
  await audit(db, req.usuario.id, "corrigir_freq", "lancamento_freq", e.id); return { ok: true };
});
app.post("/api/lancamento-nota", async (req, reply) => {
  const { disc, avaliacao, notas } = req.body || {}; const db = await getDb();
  if (!disc) return reply.code(400).send({ erro: "disciplina obrigatória" });
  if (!temPerfil(req, "direcao", "coordenacao")) return reply.code(403).send({ erro: "lançamento de notas restrito à Direção/Coordenação" });
  for (const k of Object.keys(notas || {})) { const v = Number(notas[k]); if (isNaN(v) || v < 0 || v > 10) return reply.code(400).send({ erro: `nota inválida para ${k}` }); }
  const id = await nextId(db, "lancamentos_nota", "NT-", 4);
  await db.query(`INSERT INTO lancamentos_nota (id,disc,avaliacao,notas,autor,registrado_em) VALUES ($1,$2,$3,$4,$5,$6)`, [id, disc, avaliacao || "VC1", j(notas || {}), ator(req), stamp()]);
  await audit(db, req.usuario.id, "lancar_nota", "disciplina", disc); return { ok: true, id };
});
app.delete("/api/lancamento-nota/:id", async (req, reply) => {
  const db = await getDb(); const e = (await db.query(`SELECT * FROM lancamentos_nota WHERE id=$1`, [req.params.id])).rows[0];
  if (!e) return reply.code(404).send({ erro: "não encontrado" });
  if (!temPerfil(req, "direcao", "coordenacao")) return reply.code(403).send({ erro: "apenas Direção/Coordenação podem excluir" });
  await db.query(`DELETE FROM lancamentos_nota WHERE id=$1`, [req.params.id]); await audit(db, req.usuario.id, "excluir_nota", "lancamento_nota", req.params.id); return { ok: true };
});
app.put("/api/disciplina/:cod/instrutor", async (req, reply) => {
  if (!temPerfil(req, "direcao", "coordenacao")) return reply.code(403).send({ erro: "sem permissão" });
  const { usuario_id, instrutor } = req.body || {}; const db = await getDb();
  await db.query(`UPDATE disciplinas SET instrutor_id=$1, instrutor=COALESCE($2,instrutor) WHERE cod=$3`, [usuario_id || null, instrutor || null, req.params.cod]);
  await audit(db, req.usuario.id, "designar_instrutor", "disciplina", req.params.cod, usuario_id || ""); return { ok: true };
});

// ----------------- Fatos Observados -----------------
app.post("/api/fo", async (req, reply) => {
  if (!temPerfil(req, "instrutor", "monitor", "coordenacao", "direcao")) return reply.code(403).send({ erro: "sem permissão para originar FO" });
  const { tipo, aluno, ctx, desc, disp } = req.body || {};
  if (!aluno || !desc) return reply.code(400).send({ erro: "aluno e descrição obrigatórios" });
  const db = await getDb(); const id = await nextId(db, "fatos_observados", "FO-", 4);
  const trilha = [{ data: stamp(), autor: ator(req), acao: `Registrou FO ${tipo === "FOP" ? "Positivo" : "Negativo"}`, det: "" }];
  await db.query(`INSERT INTO fatos_observados (id,tipo,aluno,ctx,descricao,disp,estado,orig,orig_nm,trilha) VALUES ($1,$2,$3,$4,$5,$6,'registrado',$7,$8,$9)`,
    [id, tipo || "FON", aluno, ctx || "", desc, disp || "", req.usuario.perfis[0], ator(req), j(trilha)]);
  await audit(db, req.usuario.id, "registrar_fo", "fato_observado", id); return { ok: true, id };
});
app.post("/api/fo/:id/tramitar", async (req, reply) => {
  const { acao, det } = req.body || {}; const db = await getDb();
  const f = (await db.query(`SELECT * FROM fatos_observados WHERE id=$1`, [req.params.id])).rows[0];
  if (!f) return reply.code(404).send({ erro: "FO não encontrado" });
  const triage = temPerfil(req, "coordenacao", "direcao");
  const M = {
    homologar: ["concluido", "Homologou o mérito", triage],
    arquivar: ["concluido", "Arquivou de plano", triage],
    devolver: ["registrado", "Devolveu para complementação", triage],
    acolher: ["contraditorio", "Acolheu e instaurou PDES", triage],
    orientacao: ["concluido", "Resolveu com orientação", triage],
    pde: ["decisao", "Propôs PDE (desligamento)", temPerfil(req, "direcao")],
    medida: ["concluido", "Aplicou medida educativa", triage],
    arquivar_dec: ["concluido", "Decidiu pelo arquivamento", triage],
    lembrete: [f.estado, "Notificou o aluno", triage],
    defesa: ["decisao", "Apresentou defesa escrita", req.usuario.tipo === "aluno" && f.aluno === req.usuario.id && f.estado === "contraditorio"],
  };
  const m = M[acao]; if (!m) return reply.code(400).send({ erro: "ação inválida" });
  if (!m[2]) return reply.code(403).send({ erro: "sem permissão para esta ação" });
  const trilha = p(f.trilha) || []; trilha.push({ data: stamp(), autor: ator(req), acao: m[1], det: det || "" });
  await db.query(`UPDATE fatos_observados SET estado=$1, trilha=$2 WHERE id=$3`, [m[0], j(trilha), f.id]);
  await audit(db, req.usuario.id, "tramitar_fo", "fato_observado", f.id, acao); return { ok: true, estado: m[0] };
});
app.delete("/api/fo/:id", async (req, reply) => {
  if (!temPerfil(req, "direcao")) return reply.code(403).send({ erro: "apenas a Direção" });
  const db = await getDb(); await db.query(`DELETE FROM fatos_observados WHERE id=$1`, [req.params.id]);
  await audit(db, req.usuario.id, "excluir_fo", "fato_observado", req.params.id); return { ok: true };
});

// ----------------- Recursos -----------------
app.post("/api/recurso", async (req, reply) => {
  if (req.usuario.tipo !== "aluno") return reply.code(403).send({ erro: "apenas o aluno protocola recurso" });
  const { disc, aval, notaSolicitada, justAluno } = req.body || {};
  if (!disc || notaSolicitada == null || !justAluno || String(justAluno).length < 30) return reply.code(400).send({ erro: "disciplina, nota solicitada e justificativa (≥30) obrigatórias" });
  const db = await getDb(); const id = await nextId(db, "recursos", "R-2026-", 3);
  const { NOTAS } = await computar(db); const nOrig = (NOTAS[req.usuario.id] || {})[disc] ?? null;
  const trilha = [{ data: stamp(), autor: ator(req), acao: "Pedido protocolado", det: `Revisão de ${disc}.` }];
  await db.query(`INSERT INTO recursos (id,aluno,disc,aval,nota_orig,nota_solicitada,just_aluno,data_abertura,estado,trilha) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'aberto',$9)`,
    [id, req.usuario.id, disc, aval || "VC1", nOrig, Number(notaSolicitada), justAluno, stamp(), j(trilha)]);
  await audit(db, req.usuario.id, "protocolar_recurso", "recurso", id); return { ok: true, id };
});
app.post("/api/recurso/:id/responder", async (req, reply) => {
  const db = await getDb(); const r = (await db.query(`SELECT * FROM recursos WHERE id=$1`, [req.params.id])).rows[0];
  if (!r) return reply.code(404).send({ erro: "recurso não encontrado" });
  if (!temPerfil(req, "direcao", "coordenacao")) return reply.code(403).send({ erro: "resposta a recurso restrita à Direção/Coordenação" });
  const { resultado, notaFinal, fundamentacao } = req.body || {};
  if (!resultado || !fundamentacao || String(fundamentacao).length < 30) return reply.code(400).send({ erro: "resultado e fundamentação (≥30) obrigatórios" });
  const trilha = p(r.trilha) || []; trilha.push({ data: stamp(), autor: ator(req), acao: `Decisão do instrutor: ${resultado}`, det: String(fundamentacao).slice(0, 140) });
  await db.query(`UPDATE recursos SET estado='respondido', resposta_inst=$1, trilha=$2 WHERE id=$3`, [j({ autorNm: ator(req), resultado, notaFinal: Number(notaFinal), fundamentacao, data: stamp() }), j(trilha), r.id]);
  await audit(db, req.usuario.id, "responder_recurso", "recurso", r.id); return { ok: true };
});
app.post("/api/recurso/:id/escalar", async (req, reply) => {
  const db = await getDb(); const r = (await db.query(`SELECT * FROM recursos WHERE id=$1`, [req.params.id])).rows[0];
  if (!r) return reply.code(404).send({ erro: "não encontrado" });
  if (!(req.usuario.tipo === "aluno" && r.aluno === req.usuario.id)) return reply.code(403).send({ erro: "apenas o próprio aluno" });
  const { motivo } = req.body || {}; if (!motivo || String(motivo).length < 30) return reply.code(400).send({ erro: "motivo (≥30) obrigatório" });
  const trilha = p(r.trilha) || []; trilha.push({ data: stamp(), autor: ator(req), acao: "Escalado à Coordenação", det: String(motivo).slice(0, 140) });
  await db.query(`UPDATE recursos SET estado='escalado', motivo_escalada=$1, data_escalada=$2, trilha=$3 WHERE id=$4`, [motivo, stamp(), j(trilha), r.id]);
  await audit(db, req.usuario.id, "escalar_recurso", "recurso", r.id); return { ok: true };
});
app.post("/api/recurso/:id/aceitar", async (req, reply) => {
  const db = await getDb(); const r = (await db.query(`SELECT * FROM recursos WHERE id=$1`, [req.params.id])).rows[0];
  if (!r) return reply.code(404).send({ erro: "não encontrado" });
  if (!(req.usuario.tipo === "aluno" && r.aluno === req.usuario.id)) return reply.code(403).send({ erro: "apenas o próprio aluno" });
  if (r.estado !== "respondido") return reply.code(400).send({ erro: "recurso não está aguardando aceite" });
  const resp = p(r.resposta_inst) || {};
  const trilha = p(r.trilha) || []; trilha.push({ data: stamp(), autor: ator(req), acao: "Aceitou a decisão", det: "Aceite expresso — recurso encerrado em 1ª instância." });
  await db.query(`UPDATE recursos SET estado='concluido_inst', decisao=$1, trilha=$2 WHERE id=$3`, [j({ por: "instrutor", autorNm: resp.autorNm, resultado: resp.resultado, notaFinal: resp.notaFinal, fundamentacao: resp.fundamentacao, data: resp.data }), j(trilha), r.id]);
  await audit(db, req.usuario.id, "aceitar_recurso", "recurso", r.id); return { ok: true };
});
app.post("/api/recurso/:id/decidir", async (req, reply) => {
  if (!temPerfil(req, "coordenacao", "direcao")) return reply.code(403).send({ erro: "sem permissão" });
  const db = await getDb(); const r = (await db.query(`SELECT * FROM recursos WHERE id=$1`, [req.params.id])).rows[0];
  if (!r) return reply.code(404).send({ erro: "não encontrado" });
  const { resultado, notaFinal, fundamentacao } = req.body || {};
  if (!resultado || !fundamentacao || String(fundamentacao).length < 30) return reply.code(400).send({ erro: "resultado e fundamentação (≥30) obrigatórios" });
  const trilha = p(r.trilha) || []; trilha.push({ data: stamp(), autor: ator(req), acao: `Decisão da Coordenação/Direção: ${resultado}`, det: String(fundamentacao).slice(0, 140) });
  await db.query(`UPDATE recursos SET estado='concluido_coord', decisao=$1, trilha=$2 WHERE id=$3`, [j({ por: req.usuario.perfis[0], autorNm: ator(req), resultado, notaFinal: Number(notaFinal), fundamentacao, data: stamp() }), j(trilha), r.id]);
  await audit(db, req.usuario.id, "decidir_recurso", "recurso", r.id); return { ok: true };
});
app.delete("/api/recurso/:id", async (req, reply) => {
  if (!temPerfil(req, "direcao")) return reply.code(403).send({ erro: "apenas a Direção" });
  const db = await getDb(); await db.query(`DELETE FROM recursos WHERE id=$1`, [req.params.id]);
  await audit(db, req.usuario.id, "excluir_recurso", "recurso", req.params.id); return { ok: true };
});

// ----------------- Pessoas (Direção) -----------------
app.post("/api/pessoa", async (req, reply) => {
  if (!temPerfil(req, "direcao")) return reply.code(403).send({ erro: "apenas a Direção" });
  const b = req.body || {};
  if (!b.postoGrad || !b.nome || !(b.perfis && b.perfis.length)) return reply.code(400).send({ erro: "posto, nome e ao menos um perfil" });
  const db = await getDb(); const ehAluno = b.perfis.length === 1 && b.perfis[0] === "aluno";
  const id = await nextUsuarioId(db, ehAluno); const ini = senhaInicial({ senha_inicial: b.senhaInicial, re: b.re });
  if (ehAluno) {
    const prec = (await db.query(`SELECT COALESCE(MAX(precedencia),0)+1 AS p FROM usuarios WHERE tipo='aluno'`)).rows[0].p;
    await db.query(`INSERT INTO usuarios (id,tipo,posto_grad,nome,re,precedencia,senha_inicial,senha_hash,senha_provisoria,ativo,nascimento,sexo) VALUES ($1,'aluno',$2,$3,$4,$5,$6,$7,TRUE,TRUE,$8,$9)`, [id, b.postoGrad, b.nome, b.re || null, prec, b.senhaInicial || null, hashSenha(ini), b.nascimento || null, b.sexo || null]);
  } else {
    await db.query(`INSERT INTO usuarios (id,tipo,posto_grad,nome,re,cargo,obs,senha_inicial,senha_hash,senha_provisoria,ativo,nascimento,sexo) VALUES ($1,'equipe',$2,$3,$4,$5,$6,$7,$8,TRUE,TRUE,$9,$10)`, [id, b.postoGrad, b.nome, b.re || null, b.cargo || null, b.obs || null, b.senhaInicial || null, hashSenha(ini), b.nascimento || null, b.sexo || null]);
  }
  for (const perf of b.perfis) await db.query(`INSERT INTO perfis (usuario_id,perfil) VALUES ($1,$2)`, [id, perf]);
  await audit(db, req.usuario.id, "criar_pessoa", "usuario", id); return { ok: true, id };
});
app.put("/api/pessoa/:id", async (req, reply) => {
  if (!temPerfil(req, "direcao")) return reply.code(403).send({ erro: "apenas a Direção" });
  const b = req.body || {}; const db = await getDb();
  await db.query(`UPDATE usuarios SET posto_grad=COALESCE($1,posto_grad), nome=COALESCE($2,nome), re=COALESCE($3,re), cargo=COALESCE($4,cargo), obs=COALESCE($5,obs), nascimento=COALESCE($6,nascimento), sexo=COALESCE($7,sexo) WHERE id=$8`, [b.postoGrad ?? null, b.nome ?? null, b.re ?? null, b.cargo ?? null, b.obs ?? null, b.nascimento ?? null, b.sexo ?? null, req.params.id]);
  if (Array.isArray(b.perfis)) { await db.query(`DELETE FROM perfis WHERE usuario_id=$1`, [req.params.id]); for (const perf of b.perfis) await db.query(`INSERT INTO perfis (usuario_id,perfil) VALUES ($1,$2)`, [req.params.id, perf]); }
  await audit(db, req.usuario.id, "editar_pessoa", "usuario", req.params.id); return { ok: true };
});
app.post("/api/pessoa/:id/reset-senha", async (req, reply) => {
  if (!temPerfil(req, "direcao")) return reply.code(403).send({ erro: "apenas a Direção" });
  const db = await getDb(); const u = (await db.query(`SELECT * FROM usuarios WHERE id=$1`, [req.params.id])).rows[0];
  if (!u) return reply.code(404).send({ erro: "não encontrado" });
  await db.query(`UPDATE usuarios SET senha_hash=$1, senha_provisoria=TRUE WHERE id=$2`, [hashSenha(senhaInicial(u)), u.id]);
  await audit(db, req.usuario.id, "resetar_senha", "usuario", u.id); return { ok: true };
});
app.delete("/api/pessoa/:id", async (req, reply) => {
  if (!temPerfil(req, "direcao")) return reply.code(403).send({ erro: "apenas a Direção" });
  const db = await getDb(); await db.query(`DELETE FROM perfis WHERE usuario_id=$1`, [req.params.id]); await db.query(`DELETE FROM usuarios WHERE id=$1`, [req.params.id]);
  await audit(db, req.usuario.id, "remover_pessoa", "usuario", req.params.id); return { ok: true };
});

// ----------------- estado em bloco (Direção/Coordenação) — QTS, normativos, etc. -----------------
app.post("/api/estado", async (req, reply) => {
  if (!temPerfil(req, "direcao", "coordenacao")) return reply.code(403).send({ erro: "sem permissão" });
  const s = req.body || {}; const db = await getDb();
  await db.tx(async (q) => {
    if (s.QTS_CACHE && typeof s.QTS_CACHE === "object") { await q("DELETE FROM qts_semanas"); for (const k of Object.keys(s.QTS_CACHE)) await q(`INSERT INTO qts_semanas (semana,dados) VALUES ($1,$2)`, [parseInt(k, 10), j(s.QTS_CACHE[k])]); }
    if (Array.isArray(s.NORMATIVOS)) { await q("DELETE FROM normativos"); for (let i = 0; i < s.NORMATIVOS.length; i++) { const n = s.NORMATIVOS[i]; await q(`INSERT INTO normativos (id,dados) VALUES ($1,$2)`, [n.id || `norm-${i + 1}`, j(n)]); } }
  });
  await audit(db, req.usuario.id, "gravar_estado"); return { ok: true };
});

// ----------------- assinatura eletrônica gov.br (groundwork — ativa na nuvem) -----------------
// Nesta fase registra-se a SOLICITAÇÃO de assinatura por documento/ato. O ciclo real
// (OAuth gov.br + aposição da assinatura no PDF + callback) liga quando a plataforma
// estiver na nuvem com HTTPS e as credenciais gov.br (GOVBR_CLIENT_ID/SECRET) definidas.
const GOVBR_CONFIG = {
  configurado: !!(process.env.GOVBR_CLIENT_ID && process.env.GOVBR_CLIENT_SECRET),
  provedor: "govbr",
  ambiente: process.env.GOVBR_AMBIENTE || "homologacao",
};
app.get("/api/assinatura/config", async () => ({ ...GOVBR_CONFIG }));
app.post("/api/assinatura/solicitar", async (req, reply) => {
  const { tipo, refId, descricao } = req.body || {};
  if (!tipo || !refId) return reply.code(400).send({ erro: "tipo e refId obrigatórios" });
  const db = await getDb(); const id = await nextId(db, "assinaturas", "ASS-", 5);
  await db.query(`INSERT INTO assinaturas (id,tipo,ref_id,descricao,signatario_id,signatario_nome,status,provedor,solicitada_em) VALUES ($1,$2,$3,$4,$5,$6,'solicitada','govbr',$7)`,
    [id, tipo, String(refId), descricao || "", req.usuario.id, ator(req), new Date().toISOString()]);
  await audit(db, req.usuario.id, "solicitar_assinatura", tipo, String(refId));
  // Quando o gov.br estiver configurado (nuvem), aqui inicia o fluxo OAuth/assinatura.
  return { ok: true, id, status: "solicitada", govbrConfigurado: GOVBR_CONFIG.configurado,
    aviso: GOVBR_CONFIG.configurado ? null : "Integração gov.br ainda não configurada (pendente de nuvem/HTTPS). Solicitação registrada para ativação posterior." };
});
app.get("/api/assinaturas", async (req) => {
  const db = await getDb(); const { tipo, refId } = req.query || {};
  let sql = "SELECT * FROM assinaturas"; const args = []; const cond = [];
  if (tipo) { args.push(tipo); cond.push(`tipo=$${args.length}`); }
  if (refId) { args.push(String(refId)); cond.push(`ref_id=$${args.length}`); }
  if (cond.length) sql += " WHERE " + cond.join(" AND ");
  sql += " ORDER BY solicitada_em DESC";
  const rows = (await db.query(sql, args)).rows;
  return rows.map((r) => ({ id: r.id, tipo: r.tipo, refId: r.ref_id, descricao: r.descricao, signatarioNome: r.signatario_nome, status: r.status, provedor: r.provedor, protocolo: r.protocolo, solicitadaEm: r.solicitada_em, assinadaEm: r.assinada_em }));
});

// ----------------- TAF / TFM (Coordenação e Educador Físico) -----------------
const podeTAF = (req) => temPerfil(req, "direcao", "coordenacao", "educador_fisico");
let _padCache = null;
app.get("/api/pad", async () => {
  if (!_padCache) { try { _padCache = JSON.parse(await readFile(path.join(PUBLIC_DIR, "..", "seed", "pad.json"), "utf8")); } catch { _padCache = { faixas: [], provas: {} }; } }
  return _padCache;
});
app.get("/api/taf", async (req) => {
  const db = await getDb();
  const eventos = (await db.query("SELECT * FROM taf_eventos ORDER BY ordem, data, id")).rows.map((e) => ({ id: e.id, nome: e.nome, tipo: e.tipo, data: e.data, ordem: e.ordem, obs: e.obs }));
  let res = (await db.query("SELECT * FROM taf_resultados")).rows;
  if (req.usuario.tipo === "aluno") res = res.filter((r) => r.aluno_id === req.usuario.id);
  const resultados = res.map((r) => ({ id: r.id, eventoId: r.evento_id, alunoId: r.aluno_id, dados: p(r.dados) || {}, nota: r.nota, obs: r.obs, autor: r.autor, registradoEm: r.registrado_em }));
  return { eventos, resultados };
});
app.post("/api/taf/evento", async (req, reply) => {
  if (!podeTAF(req)) return reply.code(403).send({ erro: "sem permissão (TAF restrito à Coordenação/Educador Físico)" });
  const b = req.body || {}; const db = await getDb();
  if (!b.nome || !b.tipo) return reply.code(400).send({ erro: "nome e tipo obrigatórios" });
  let id = b.id;
  if (id) await db.query("UPDATE taf_eventos SET nome=$1,tipo=$2,data=$3,ordem=$4,obs=$5 WHERE id=$6", [b.nome, b.tipo, b.data || null, b.ordem ?? 0, b.obs || "", id]);
  else { id = await nextId(db, "taf_eventos", "TAF-", 4); await db.query("INSERT INTO taf_eventos (id,nome,tipo,data,ordem,obs,criado_em) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id, b.nome, b.tipo, b.data || null, b.ordem ?? 0, b.obs || "", new Date().toISOString()]); }
  await audit(db, req.usuario.id, "taf_evento", "taf_evento", id); return { ok: true, id };
});
app.delete("/api/taf/evento/:id", async (req, reply) => {
  if (!podeTAF(req)) return reply.code(403).send({ erro: "sem permissão" });
  const db = await getDb(); await db.query("DELETE FROM taf_resultados WHERE evento_id=$1", [req.params.id]); await db.query("DELETE FROM taf_eventos WHERE id=$1", [req.params.id]);
  await audit(db, req.usuario.id, "taf_evento_excluir", "taf_evento", req.params.id); return { ok: true };
});
app.post("/api/taf/resultado", async (req, reply) => {
  if (!podeTAF(req)) return reply.code(403).send({ erro: "sem permissão" });
  const b = req.body || {}; if (!b.eventoId || !b.alunoId) return reply.code(400).send({ erro: "eventoId e alunoId obrigatórios" });
  const db = await getDb();
  const ex = (await db.query("SELECT id FROM taf_resultados WHERE evento_id=$1 AND aluno_id=$2", [b.eventoId, b.alunoId])).rows[0];
  if (ex) await db.query("UPDATE taf_resultados SET dados=$1,nota=$2,obs=$3,autor=$4,registrado_em=$5 WHERE id=$6", [j(b.dados || {}), b.nota ?? null, b.obs || "", ator(req), stamp(), ex.id]);
  else { const id = await nextId(db, "taf_resultados", "TR-", 5); await db.query("INSERT INTO taf_resultados (id,evento_id,aluno_id,dados,nota,obs,autor,registrado_em) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [id, b.eventoId, b.alunoId, j(b.dados || {}), b.nota ?? null, b.obs || "", ator(req), stamp()]); }
  await audit(db, req.usuario.id, "taf_resultado", "taf", b.eventoId + ":" + b.alunoId); return { ok: true };
});
app.delete("/api/taf/resultado/:id", async (req, reply) => {
  if (!podeTAF(req)) return reply.code(403).send({ erro: "sem permissão" });
  const db = await getDb(); await db.query("DELETE FROM taf_resultados WHERE id=$1", [req.params.id]);
  await audit(db, req.usuario.id, "taf_resultado_excluir", "taf_resultado", req.params.id); return { ok: true };
});
// Treinos individualizados (arquivo por aluno)
app.get("/api/treinos", async (req) => {
  const db = await getDb(); let rows = (await db.query("SELECT id,aluno_id,titulo,arquivo_nome,mime,descricao,autor,criado_em FROM treinos ORDER BY criado_em DESC")).rows;
  if (req.usuario.tipo === "aluno") rows = rows.filter((r) => r.aluno_id === req.usuario.id);
  return rows.map((r) => ({ id: r.id, alunoId: r.aluno_id, titulo: r.titulo, arquivoNome: r.arquivo_nome, mime: r.mime, descricao: r.descricao, autor: r.autor, criadoEm: r.criado_em }));
});
app.get("/api/treino/:id", async (req, reply) => {
  const db = await getDb(); const t = (await db.query("SELECT * FROM treinos WHERE id=$1", [req.params.id])).rows[0];
  if (!t) return reply.code(404).send({ erro: "não encontrado" });
  if (req.usuario.tipo === "aluno" && t.aluno_id !== req.usuario.id) return reply.code(403).send({ erro: "sem permissão" });
  return { id: t.id, alunoId: t.aluno_id, titulo: t.titulo, arquivoNome: t.arquivo_nome, mime: t.mime, conteudo: t.conteudo };
});
app.post("/api/treino", async (req, reply) => {
  if (!podeTAF(req)) return reply.code(403).send({ erro: "sem permissão para enviar treinos" });
  const b = req.body || {}; if (!b.alunoId || !b.conteudo) return reply.code(400).send({ erro: "alunoId e arquivo obrigatórios" });
  const db = await getDb(); const id = await nextId(db, "treinos", "TRE-", 4);
  await db.query("INSERT INTO treinos (id,aluno_id,titulo,arquivo_nome,mime,conteudo,descricao,autor,criado_em) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [id, b.alunoId, b.titulo || b.arquivoNome || "Treino", b.arquivoNome || "treino", b.mime || "application/octet-stream", b.conteudo, b.descricao || "", ator(req), new Date().toISOString()]);
  await audit(db, req.usuario.id, "treino_enviar", "treino", id); return { ok: true, id };
});
app.delete("/api/treino/:id", async (req, reply) => {
  if (!podeTAF(req)) return reply.code(403).send({ erro: "sem permissão" });
  const db = await getDb(); await db.query("DELETE FROM treinos WHERE id=$1", [req.params.id]);
  await audit(db, req.usuario.id, "treino_excluir", "treino", req.params.id); return { ok: true };
});

// ----------------- Central de Melhorias: bugs e sugestões (todos reportam; Direção/Coordenação gerem) -----------------
const FB_GESTOR = (req) => temPerfil(req, "direcao", "coordenacao");
app.get("/api/feedbacks", async (req) => {
  const db = await getDb(); let rows = (await db.query("SELECT * FROM feedback ORDER BY criado_em DESC")).rows;
  if (!FB_GESTOR(req)) rows = rows.filter((r) => r.autor_id === req.usuario.id);
  return rows.map((r) => ({ id: r.id, tipo: r.tipo, titulo: r.titulo, tela: r.tela, severidade: r.severidade, descricao: r.descricao, passos: r.passos, esperado: r.esperado, autorId: r.autor_id, autorNome: r.autor_nome, perfil: r.perfil, status: r.status, resposta: r.resposta, versao: r.versao, criadoEm: r.criado_em }));
});
app.post("/api/feedback", async (req, reply) => {
  const b = req.body || {}; if (!b.tipo || !b.titulo) return reply.code(400).send({ erro: "tipo e título obrigatórios" });
  const db = await getDb(); const id = await nextId(db, "feedback", "FB-", 4);
  await db.query("INSERT INTO feedback (id,tipo,titulo,tela,severidade,descricao,passos,esperado,autor_id,autor_nome,perfil,status,resposta,versao,user_agent,criado_em) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'novo','',$12,$13,$14)",
    [id, b.tipo, String(b.titulo).slice(0, 200), b.tela || "", b.severidade || "", b.descricao || "", b.passos || "", b.esperado || "", req.usuario.id, ator(req), req.usuario.perfis[0] || req.usuario.tipo, b.versao || "", String(b.userAgent || "").slice(0, 300), new Date().toISOString()]);
  await audit(db, req.usuario.id, "feedback_enviar", "feedback", id); return { ok: true, id };
});
app.post("/api/feedback/:id", async (req, reply) => {
  if (!FB_GESTOR(req)) return reply.code(403).send({ erro: "apenas Direção/Coordenação" });
  const b = req.body || {}; const db = await getDb();
  await db.query("UPDATE feedback SET status=COALESCE($1,status), resposta=COALESCE($2,resposta) WHERE id=$3", [b.status ?? null, b.resposta ?? null, req.params.id]);
  await audit(db, req.usuario.id, "feedback_status", "feedback", req.params.id, b.status || ""); return { ok: true };
});
app.delete("/api/feedback/:id", async (req, reply) => {
  if (!temPerfil(req, "direcao")) return reply.code(403).send({ erro: "apenas a Direção" });
  const db = await getDb(); await db.query("DELETE FROM feedback WHERE id=$1", [req.params.id]);
  await audit(db, req.usuario.id, "feedback_excluir", "feedback", req.params.id); return { ok: true };
});

// ----------------- backup / restauração integral (Direção) — portabilidade entre PCs -----------------
// Tabelas e colunas do backup. auditoria entra sem a coluna id (BIGSERIAL regenera).
const BACKUP_TABELAS = [
  { t: "usuarios", cols: ["id","tipo","posto_grad","nome","re","precedencia","cargo","obs","senha_inicial","senha_hash","senha_provisoria","ativo","nascimento","sexo"] },
  { t: "perfis", cols: ["usuario_id","perfil"] },
  { t: "disciplinas", cols: ["cod","ord","nucleo","nome","ch","peso","natureza","instrutor","instrutor_id"] },
  { t: "lancamentos_freq", cols: ["id","data","disc","ha","faltas","autor","registrado_em"] },
  { t: "lancamentos_nota", cols: ["id","disc","avaliacao","notas","autor","registrado_em"] },
  { t: "fatos_observados", cols: ["id","tipo","aluno","ctx","descricao","disp","estado","orig","orig_nm","trilha"] },
  { t: "recursos", cols: ["id","aluno","disc","aval","nota_orig","nota_solicitada","just_aluno","data_abertura","estado","resposta_inst","motivo_escalada","data_escalada","decisao","trilha"] },
  { t: "normativos", cols: ["id","dados"] },
  { t: "qts_semanas", cols: ["semana","dados"] },
  { t: "estado_kv", cols: ["chave","valor"] },
  { t: "auditoria", cols: ["em","usuario_id","acao","entidade","registro_id","detalhe"] },
  { t: "assinaturas", cols: ["id","tipo","ref_id","descricao","signatario_id","signatario_nome","status","provedor","protocolo","solicitada_em","assinada_em"] },
  { t: "taf_eventos", cols: ["id","nome","tipo","data","ordem","obs","criado_em"] },
  { t: "taf_resultados", cols: ["id","evento_id","aluno_id","dados","nota","obs","autor","registrado_em"] },
  { t: "treinos", cols: ["id","aluno_id","titulo","arquivo_nome","mime","conteudo","descricao","autor","criado_em"] },
  { t: "feedback", cols: ["id","tipo","titulo","tela","severidade","descricao","passos","esperado","autor_id","autor_nome","perfil","status","resposta","versao","user_agent","criado_em"] },
];
app.get("/api/backup", async (req, reply) => {
  if (!temPerfil(req, "direcao")) return reply.code(403).send({ erro: "apenas a Direção" });
  const db = await getDb(); const dados = {};
  for (const { t, cols } of BACKUP_TABELAS) dados[t] = (await db.query(`SELECT ${cols.join(",")} FROM ${t}`)).rows;
  await audit(db, req.usuario.id, "exportar_backup");
  const blob = { meta: { versao: 1, sistema: "CHQAO BM 2026", exportadoEm: new Date().toISOString(), exportadoPor: ator(req) }, dados };
  const nome = `chqao-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return reply.header("Content-Disposition", `attachment; filename="${nome}"`).type("application/json; charset=utf-8").send(JSON.stringify(blob, null, 2));
});
app.post("/api/restore", async (req, reply) => {
  if (!temPerfil(req, "direcao")) return reply.code(403).send({ erro: "apenas a Direção" });
  const body = req.body || {}; const dados = body.dados || body;   // aceita o arquivo inteiro ou só {dados}
  if (!dados || typeof dados !== "object" || !Array.isArray(dados.usuarios)) return reply.code(400).send({ erro: "arquivo de backup inválido (sem 'usuarios')" });
  const db = await getDb(); const contagem = {};
  await db.tx(async (q) => {
    for (let i = BACKUP_TABELAS.length - 1; i >= 0; i--) await q(`DELETE FROM ${BACKUP_TABELAS[i].t}`);   // limpa na ordem inversa
    for (const { t, cols } of BACKUP_TABELAS) {
      const linhas = Array.isArray(dados[t]) ? dados[t] : [];
      const ph = cols.map((_, k) => `$${k + 1}`).join(",");
      for (const row of linhas) await q(`INSERT INTO ${t} (${cols.join(",")}) VALUES (${ph})`, cols.map((c) => (row[c] === undefined ? null : row[c])));
      contagem[t] = linhas.length;
    }
  });
  await audit(db, req.usuario.id, "restaurar_backup", null, null, JSON.stringify(contagem));
  return { ok: true, contagem };
});

const PORT = parseInt(process.env.PORT || "8088", 10);
await initSchema();
await app.listen({ host: "0.0.0.0", port: PORT });
console.log(`Backend CHQAO (Fase 2b granular) ouvindo em http://127.0.0.1:${PORT}  [db: ${(await getDb()).tipo}]`);
