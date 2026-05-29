import {
  randomBytes,
  timingSafeEqual,
  scrypt as scryptCallback,
  type ScryptOptions,
} from "node:crypto";

const KEY_LENGTH = 64;
const DEFAULT_N = 16384;
const DEFAULT_R = 8;
const DEFAULT_P = 1;

function scrypt(
  password: string,
  salt: string,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, KEY_LENGTH, {
    N: DEFAULT_N,
    r: DEFAULT_R,
    p: DEFAULT_P,
  });

  return `scrypt$${DEFAULT_N}$${DEFAULT_R}$${DEFAULT_P}$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [algorithm, n, r, p, salt, expectedHex] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !salt || !expectedHex) {
    return false;
  }

  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(password, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
