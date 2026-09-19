import { prepareTestDatabase } from "../test-support/testDatabase";

export default function globalSetup() {
  prepareTestDatabase();
}
