// Autenticação: hash de senha com scrypt (nativo do Node, sem dependências).
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

export function hashSenha(senha) {
  const salt = randomBytes(16);
  const dk = scryptSync(String(senha), salt, 64);
  return `scrypt$${salt.toString("hex")}$${dk.toString("hex")}`;
}

export function verificaSenha(senha, armazenado) {
  if (!armazenado || typeof armazenado !== "string") return false;
  const [alg, saltHex, hashHex] = armazenado.split("$");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const dk = scryptSync(String(senha), Buffer.from(saltHex, "hex"), 64);
  const exp = Buffer.from(hashHex, "hex");
  return dk.length === exp.length && timingSafeEqual(dk, exp);
}

// Normaliza um login/usuário: minúsculas, sem acentos, espaços colapsados.
// Usado tanto no cadastro (grava normalizado) quanto no login (compara normalizado),
// para que "Sérgio", "sergio" e " SERGIO " caiam no mesmo usuário.
export function normLogin(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .trim().toLowerCase().replace(/\s+/g, " ");
}

// Senha inicial: senha_inicial customizada -> RE válido -> "1234"
export function senhaInicial(u) {
  if (u.senha_inicial && String(u.senha_inicial).trim()) return String(u.senha_inicial).trim();
  if (u.re && u.re !== "—" && String(u.re).trim() !== "") return String(u.re).trim();
  return "1234";
}
