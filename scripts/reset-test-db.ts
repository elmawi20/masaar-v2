import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const devUrl = process.env.DATABASE_URL || "";
const testUrl =
  process.env.TEST_DATABASE_URL ||
  devUrl.replace(/\/masaar_dev(\?.*)?$/, "/masaar_test$1");

export function resetTestDatabaseClean() {
  if (!testUrl.includes("masaar_test")) {
    throw new Error(
      "Safety check failed: Target database URL must contain 'masaar_test'!"
    );
  }
  if (testUrl.includes("masaar_dev")) {
    throw new Error(
      "Safety check failed: Target database URL must NEVER point to 'masaar_dev'!"
    );
  }

  console.log("🔄 Resetting masaar_test to clean migrated state...");
  execSync("npx prisma migrate reset --force --skip-seed --skip-generate", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: testUrl,
    },
  });
  console.log("✅ masaar_test reset complete.");
}

if (require.main === module || process.argv[1]?.includes("reset-test-db")) {
  resetTestDatabaseClean();
}
