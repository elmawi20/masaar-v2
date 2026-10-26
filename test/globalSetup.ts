import { resetTestDatabaseClean } from "../scripts/reset-test-db";

export default function globalSetup() {
  resetTestDatabaseClean();
}
