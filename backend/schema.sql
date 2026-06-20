-- Esquema do backend CHQAO BM 2026 (Fase 2). Válido em PostgreSQL e PGlite.
-- Campos aninhados (trilhas, mapas de notas/faltas) ficam como TEXT JSON, por
-- portabilidade total; os campos relevantes para autorização (aluno, estado,
-- disciplina, tipo) são colunas de primeira classe.

CREATE TABLE IF NOT EXISTS usuarios (
  id               TEXT PRIMARY KEY,
  tipo             TEXT NOT NULL,            -- 'equipe' | 'aluno'
  posto_grad       TEXT,
  nome             TEXT NOT NULL,
  re               TEXT,
  precedencia      INT,
  cargo            TEXT,
  obs              TEXT,
  senha_inicial    TEXT,
  senha_hash       TEXT,
  senha_provisoria BOOLEAN DEFAULT TRUE,
  ativo            BOOLEAN DEFAULT TRUE
);

-- data de nascimento (faixa etária do TAF) e sexo (tabela masc/fem do TAF)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nascimento TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sexo TEXT;

CREATE TABLE IF NOT EXISTS perfis (
  usuario_id TEXT NOT NULL,
  perfil     TEXT NOT NULL,
  PRIMARY KEY (usuario_id, perfil)
);

CREATE TABLE IF NOT EXISTS disciplinas (
  cod TEXT PRIMARY KEY,
  ord INT, nucleo TEXT, nome TEXT, ch INT, peso INT, natureza TEXT, instrutor TEXT
);
-- vínculo opcional disciplina -> usuário instrutor (para o RBAC granular de lançamento)
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS instrutor_id TEXT;

CREATE TABLE IF NOT EXISTS lancamentos_freq (
  id TEXT PRIMARY KEY, data TEXT, disc TEXT, ha INT, faltas TEXT,
  autor TEXT, registrado_em TEXT
);

CREATE TABLE IF NOT EXISTS lancamentos_nota (
  id TEXT PRIMARY KEY, disc TEXT, avaliacao TEXT, notas TEXT,
  autor TEXT, registrado_em TEXT
);

CREATE TABLE IF NOT EXISTS fatos_observados (
  id TEXT PRIMARY KEY, tipo TEXT, aluno TEXT, ctx TEXT, descricao TEXT,
  disp TEXT, estado TEXT, orig TEXT, orig_nm TEXT, trilha TEXT
);

CREATE TABLE IF NOT EXISTS recursos (
  id TEXT PRIMARY KEY, aluno TEXT, disc TEXT, aval TEXT,
  nota_orig REAL, nota_solicitada REAL, just_aluno TEXT, data_abertura TEXT,
  estado TEXT, resposta_inst TEXT, motivo_escalada TEXT, data_escalada TEXT,
  decisao TEXT, trilha TEXT
);

CREATE TABLE IF NOT EXISTS normativos ( id TEXT PRIMARY KEY, dados TEXT );

CREATE TABLE IF NOT EXISTS qts_semanas ( semana INT PRIMARY KEY, dados TEXT );

-- blobs derivados/config: NOTAS, FREQ, SENHAS_STORE
CREATE TABLE IF NOT EXISTS estado_kv ( chave TEXT PRIMARY KEY, valor TEXT );

CREATE TABLE IF NOT EXISTS auditoria (
  id BIGSERIAL PRIMARY KEY, em TEXT, usuario_id TEXT, acao TEXT,
  entidade TEXT, registro_id TEXT, detalhe TEXT
);

-- Assinaturas eletrônicas (gov.br). Fase 2c: groundwork — registra a SOLICITAÇÃO
-- de assinatura por documento/ato; a conclusão real ocorrerá via callback do
-- gov.br quando a plataforma estiver na nuvem (HTTPS + OAuth gov.br). Status:
-- 'solicitada' | 'assinada' | 'cancelada'.
CREATE TABLE IF NOT EXISTS assinaturas (
  id TEXT PRIMARY KEY, tipo TEXT, ref_id TEXT, descricao TEXT,
  signatario_id TEXT, signatario_nome TEXT, status TEXT, provedor TEXT,
  protocolo TEXT, solicitada_em TEXT, assinada_em TEXT
);

-- TAF / TFM: eventos de avaliação física e resultados por aluno.
-- tipo: 'diagnostico' (sem nota) | 'taf' (vale nota). dados = JSON {flexao,abdominal,corrida,barra,natacao}.
CREATE TABLE IF NOT EXISTS taf_eventos (
  id TEXT PRIMARY KEY, nome TEXT, tipo TEXT, data TEXT, ordem INT, obs TEXT, criado_em TEXT
);
CREATE TABLE IF NOT EXISTS taf_resultados (
  id TEXT PRIMARY KEY, evento_id TEXT, aluno_id TEXT, dados TEXT, nota REAL, obs TEXT, autor TEXT, registrado_em TEXT
);
-- Treinos individualizados (arquivo por aluno, guardado como base64 para portabilidade/backup).
CREATE TABLE IF NOT EXISTS treinos (
  id TEXT PRIMARY KEY, aluno_id TEXT, titulo TEXT, arquivo_nome TEXT, mime TEXT,
  conteudo TEXT, descricao TEXT, autor TEXT, criado_em TEXT
);

-- Central de Melhorias: bugs e sugestões reportados pelos usuários (viajam no backup).
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY, tipo TEXT, titulo TEXT, tela TEXT, severidade TEXT,
  descricao TEXT, passos TEXT, esperado TEXT, autor_id TEXT, autor_nome TEXT,
  perfil TEXT, status TEXT, resposta TEXT, versao TEXT, user_agent TEXT, criado_em TEXT
);
