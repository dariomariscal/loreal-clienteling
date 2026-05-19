import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const SALT = "loreal-clienteling-pwd-v1";

@Injectable()
export class PasswordCryptoService {
  private readonly key: Buffer;

  constructor() {
    const secret = process.env.USER_PASSWORD_KEY ?? process.env.BETTER_AUTH_SECRET;
    if (!secret) {
      throw new InternalServerErrorException(
        "USER_PASSWORD_KEY or BETTER_AUTH_SECRET must be set to encrypt user credentials",
      );
    }
    this.key = scryptSync(secret, SALT, 32);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString("base64");
  }

  decrypt(payload: string): string {
    const buf = Buffer.from(payload, "base64");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  }

  generate(length = 14): string {
    const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = randomBytes(length);
    let out = "";
    for (let i = 0; i < length; i++) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  }
}
