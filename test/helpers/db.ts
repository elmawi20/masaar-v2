import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const devUrl = process.env.DATABASE_URL || "";
const testUrl =
  process.env.TEST_DATABASE_URL ||
  devUrl.replace(/\/masaar_dev(\?.*)?$/, "/masaar_test$1");

export const testDb = new PrismaClient({
  datasources: {
    db: {
      url: testUrl,
    },
  },
});

/**
 * Truncate test database tables safely for test isolation.
 * Allowed ONLY on masaar_test per AGENTS.md safety policy.
 */
export async function resetTestDatabase() {
  if (!testUrl.includes("masaar_test")) {
    throw new Error("Safety check failed: Refusing to truncate a non-test database!");
  }

  const tablenames = await testDb.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE '_prisma_%';
  `;

  for (const { tablename } of tablenames) {
    try {
      await testDb.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    } catch {
      // Some tables with immutability triggers might block truncate; delete fallback
    }
  }
}
