import { inviteEmailJob } from "./features/users/jobs";
import { env } from "./platform/env";
import { queue } from "./platform/queue";

// The draining process: one install per process, then work over every
// slice's jobs — stitched here the way router.ts stitches slice routers.
await queue.install();
await queue.work([inviteEmailJob]);

const health = Bun.serve({
  port: env.WORKER_PORT,
  fetch(request) {
    if (new URL(request.url).pathname === "/healthz") {
      return new Response("ok");
    }
    return new Response("not found", { status: 404 });
  },
});
console.log(`boss worker draining jobs, healthz on :${env.WORKER_PORT}`);

// Readiness drops first, then active jobs get finished, then exit: an
// orchestrator stops routing before the drain begins.
let shuttingDown = false;
async function shutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  await health.stop();
  await queue.stop({ graceful: true });
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
