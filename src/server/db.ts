import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const devUrl = process.env.DATABASE_URL || "";
const testUrl =
  process.env.TEST_DATABASE_URL ||
  devUrl.replace(/\/masaar_dev(\?.*)?$/, "/masaar_test$1");

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: process.env.NODE_ENV === "test" && testUrl ? { db: { url: testUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
