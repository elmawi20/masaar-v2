import { execSync } from "node:child_process";
import dotenv from "dotenv";

dotenv.config();

const devUrl = process.env.DATABASE_URL;
if (!devUrl) {
  console.error("Error: DATABASE_URL not set in environment.");
  process.exit(1);
}

// Derive test DB URL from TEST_DATABASE_URL or by targeting masaar_test
const testUrl =
  process.env.TEST_DATABASE_URL ||
  devUrl.replace(/\/masaar_dev(\?.*)?$/, "/masaar_test$1");

try {
  console.log("Applying migrations to masaar_test...");
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "inherit",
  });
  console.log("Successfully prepared masaar_test database.");
} catch (error) {
  console.error("Failed to apply migrations to masaar_test:", error);
  process.exit(1);
}
