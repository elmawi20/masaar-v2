import readline from "readline";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("\n⚠️  WARNING: You are about to reset the development database (masaar_dev)!");
console.log("This will drop and recreate all tables in masaar_dev and run migrations and seeds.\n");

rl.question('To confirm, please type exactly "RESET masaar_dev": ', (answer) => {
  rl.close();
  if (answer.trim() !== "RESET masaar_dev") {
    console.log("❌ Confirmation phrase did not match. Reset cancelled.\n");
    process.exit(1);
  }

  console.log("\n🔄 Confirmation received. Resetting masaar_dev...");
  try {
    execSync("npx prisma migrate reset --force", {
      stdio: "inherit",
    });
    console.log("✅ masaar_dev successfully reset and seeded.\n");
  } catch (error) {
    console.error("❌ Failed to reset masaar_dev:", error);
    process.exit(1);
  }
});
