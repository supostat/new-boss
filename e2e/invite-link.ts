// Prints the freshest invite link for a given email straight from the job
// payloads: the queue is SQL-readable by design, and the raw token lives
// only there and in the mailed letter. Zero dependencies — Bun's built-in
// Postgres client. Usage: bun e2e/invite-link.ts <email>
import { SQL } from "bun";

const email = process.argv[2];
if (email === undefined) {
  console.error("usage: bun e2e/invite-link.ts <email>");
  process.exit(1);
}

const sql = new SQL(
  process.env.DATABASE_URL ?? "postgres://boss:boss@localhost:5432/boss",
);

const rows = await sql`
  select data->>'inviteUrl' as url
  from pgboss.job
  where name = 'auth.invite_email' and data->>'to' = ${email}
  order by created_on desc
  limit 1
`;

const url = rows[0]?.url;
if (typeof url !== "string") {
  console.error(`no invite job found for ${email}`);
  process.exit(1);
}
console.log(url);
await sql.end();
