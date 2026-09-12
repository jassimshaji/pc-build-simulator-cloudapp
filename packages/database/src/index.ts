import { PrismaClient } from "@prisma/client";

// Standard singleton pattern: prevents exhausting DB connections from
// duplicate PrismaClient instances created by hot-reload in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
