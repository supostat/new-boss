import { app } from "./app";
import { env } from "./platform/env";
import { queue } from "./platform/queue";

// The serving process enqueues jobs, and the queue contract requires a
// started instance before any enqueue — one install per process, at boot.
await queue.install();

Bun.serve({ port: env.PORT, fetch: app.fetch });
console.log(`boss server listening on :${env.PORT}`);
