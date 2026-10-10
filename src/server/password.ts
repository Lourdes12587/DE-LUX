// Password hashing with Node's built-in scrypt. No "server-only" import so scripts (scripts/set-password.ts) can use it.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1 };

/** Format: scrypt$N$saltB64$hashB64 */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  // Hash anyway when there is no stored password, so timing doesn't reveal which emails have accounts.
  const [, n, saltB64, hashB64] = (stored ?? "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$").split("$");
  const expected = Buffer.from(hashB64 ?? "", "base64");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), 64, { ...SCRYPT, N: Number(n) || SCRYPT.N });
  return !!stored && expected.length === actual.length && timingSafeEqual(expected, actual);
}

