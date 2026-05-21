import { randomInt } from "node:crypto";

const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*-_=+";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

function pick(alphabet: string): string {
  return alphabet[randomInt(0, alphabet.length)];
}

function shuffle(input: string): string {
  const arr = input.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

/**
 * Generates a 16-char password with at least one lower/upper/digit/symbol so
 * it satisfies Clerk's default password policy. Ambiguous chars (0/O, 1/l/I)
 * are excluded to make manual entry less error-prone.
 */
export function generateTemporaryPassword(length = 16): string {
  if (length < 12) {
    throw new Error("Temporary password must be at least 12 characters");
  }
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: length - required.length }, () => pick(ALL));
  return shuffle([...required, ...rest].join(""));
}
