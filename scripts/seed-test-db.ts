import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const devUrl = process.env.DATABASE_URL || "";
const testUrl =
  process.env.TEST_DATABASE_URL ||
  devUrl.replace(/\/masaar_dev(\?.*)?$/, "/masaar_test$1");

if (!testUrl.includes("masaar_test")) {
  throw new Error("Target database must be masaar_test!");
}

console.log("🌱 Seeding masaar_test with initial data...");
execSync("npm run db:seed", {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: testUrl,
  },
});
