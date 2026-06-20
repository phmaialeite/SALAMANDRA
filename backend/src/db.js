// Camada de banco unificada — PostgreSQL (produção, via DATABASE_URL) ou
// PGlite (desenvolvimento/validação, PostgreSQL em WASM, sem servidor).
// Mesmo dialeto SQL e mesma interface { query, exec, tx } nos dois.
import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let _db = null;

export async function getDb() {
  if (_db) return _db;
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    _db = {
      tipo: "postgres",
      query: (t, p) => pool.query(t, p),
      exec: (sql) => pool.query(sql),
      async tx(fn) {
        const c = await pool.connect();
        try { await c.query("BEGIN"); const r = await fn((t, p) => c.query(t, p)); await c.query("COMMIT"); return r; }
        catch (e) { await c.query("ROLLBACK"); throw e; }
        finally { c.release(); }
      },
      close: () => pool.end(),
    };
  } else {
    const dir = process.env.PGLITE_DIR || path.join(__dirname, "..", "pgdata");
    const lite = new PGlite(dir);
    await lite.waitReady;
    _db = {
      tipo: "pglite",
      query: (t, p) => lite.query(t, p),
      exec: (sql) => lite.exec(sql),
      async tx(fn) { return lite.transaction((tx) => fn((t, p) => tx.query(t, p))); },
      close: () => lite.close(),
    };
  }
  return _db;
}

export async function initSchema() {
  const db = await getDb();
  const sql = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  await db.exec(sql);
  return db;
}
