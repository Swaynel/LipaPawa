import "server-only";

import { existsSync, readFileSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getDb() {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured");
    }

    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg(createPgConfig(connectionString)),
    });
  }

  return globalForPrisma.prisma;
}

function createPgConfig(connectionString: string) {
  const ssl = getSslConfig(connectionString);
  const pgConnectionString = ssl
    ? getConnectionStringWithoutSslParams(connectionString)
    : connectionString;

  return ssl ? { connectionString: pgConnectionString, ssl } : { connectionString };
}

function getSslConfig(connectionString: string) {
  const sslMode = getSslMode(connectionString);
  const requiresSsl = ["require", "verify-ca", "verify-full"].includes(sslMode);

  if (!requiresSsl) return undefined;

  const ca = getDatabaseCa();

  if (ca) {
    return {
      ca,
      rejectUnauthorized: true,
    };
  }

  throw new Error("DATABASE_URL requires SSL, but no database CA certificate was found");
}

function getSslMode(connectionString: string) {
  try {
    return new URL(connectionString).searchParams.get("sslmode") ?? "";
  } catch {
    return "";
  }
}

function getDatabaseCa() {
  const inlineCa = process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n");
  if (inlineCa) return inlineCa;

  const caPath = "ca.pem";
  if (!existsSync(caPath)) return null;

  return readFileSync(caPath, "utf8");
}

function getConnectionStringWithoutSslParams(connectionString: string) {
  const url = new URL(connectionString);

  for (const param of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    url.searchParams.delete(param);
  }

  return url.toString();
}
