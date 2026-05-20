import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { bearer } from "better-auth/plugins";
import { jwt } from "better-auth/plugins";
import { twoFactor } from "better-auth/plugins";
import { customSession } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@loreal/database";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://loreal:loreal@localhost:5433/loreal_clienteling";

const needsSsl =
  process.env.PGSSL === "true" ||
  /sslmode=require/.test(connectionString) ||
  /neon\.tech/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

const db = drizzle(pool, { schema });

const publicApiUrl =
  process.env.BETTER_AUTH_URL ??
  process.env.PUBLIC_API_URL ??
  "http://localhost:3001";

const trustedOriginsFromEnv = (process.env.TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const auth = betterAuth({
  baseURL: publicApiUrl,
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-in-production",

  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cache
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "ba",
        input: true,
      },
      storeId: {
        type: "string",
        required: false,
        input: true,
        fieldName: "storeId",
      },
      zoneId: {
        type: "string",
        required: false,
        input: true,
        fieldName: "zoneId",
      },
      brandId: {
        type: "string",
        required: false,
        input: true,
        fieldName: "brandId",
      },
      active: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: true,
      },
      fullName: {
        type: "string",
        required: true,
        input: true,
        fieldName: "fullName",
      },
    },
  },

  trustedOrigins: [
    "http://localhost:3000", // Next.js web (dev)
    "http://localhost:8081", // Expo Metro (dev)
    "loreal-clienteling://", // Expo production scheme
    "exp://",
    "exp://*",
    "exp://**",
    "exp://192.168.*.*:*",
    "exp://192.168.*.*:*/**",
    "exp://10.*.*.*:*",
    "exp://10.*.*.*:*/**",
    ...trustedOriginsFromEnv,
  ],

  plugins: [
    // Bearer token support for native mobile clients (iOS)
    bearer(),

    // Expo support for React Native mobile app
    expo(),

    // JWT plugin for PowerSync token validation
    jwt({
      jwt: {
        issuer: publicApiUrl,
        audience: publicApiUrl,
        expirationTime: "1h",
        definePayload: ({ user }) => ({
          sub: user.id,
          email: user.email,
          role: (user as any).role,
          storeId: (user as any).storeId,
          brandId: (user as any).brandId,
          zoneId: (user as any).zoneId,
        }),
      },
    }),

    // Admin plugin for user management
    admin({
      defaultRole: "ba",
    }),

    // 2FA — required for admins, optional for BAs
    twoFactor({
      issuer: "L'Oréal Clienteling",
    }),

    // Custom session: inject business fields into session
    customSession(async ({ user, session }) => {
      return {
        user: {
          ...user,
          role: (user as any).role ?? "ba",
          storeId: (user as any).storeId ?? null,
          brandId: (user as any).brandId ?? null,
          zoneId: (user as any).zoneId ?? null,
          active: (user as any).active ?? true,
          fullName: (user as any).fullName ?? user.name,
        },
        session,
      };
    }),
  ],
});

export type Auth = typeof auth;
