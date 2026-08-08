// First-admin bootstrap: reads ADMIN_EMAIL and ADMIN_PASSWORD from the
// environment, creates the admin once, and stays a no-op afterwards.
// Single argv gate: bun scripts/create-admin.ts
import { createFirstAdmin } from "../apps/server/src/platform/bootstrap";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (email === undefined || password === undefined) {
  console.error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap the first admin.",
  );
  process.exit(1);
}

const result = await createFirstAdmin({ email, password });
console.log(
  result === "created"
    ? `Admin ${email} created.`
    : `Admin ${email} already exists; nothing to do.`,
);
