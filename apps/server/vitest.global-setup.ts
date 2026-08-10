import { PgBoss } from "pg-boss";

// The suite must hold on a FRESH database: the first enqueue-reaching test
// needs the delivery queue to exist before any worker has created it. The
// queue name and the compose URL duplicate their sources on purpose:
// importing jobs.ts would open a database pool that blocks this setup
// process from exiting, and this file lives inside apps/server because
// workspace dependencies do not resolve from a root-level module. A
// drifted literal cannot hide — the enqueue-reaching tests fail loudly on
// a missing queue.
export default async function globalSetup(): Promise<void> {
  const boss = new PgBoss(
    process.env.DATABASE_URL ?? "postgres://boss:boss@localhost:5432/boss",
  );
  await boss.start();
  await boss.createQueue("auth.invite_email");
  await boss.stop({ graceful: false });
}
