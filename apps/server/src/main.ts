import { app } from "./app";
import { env } from "./platform/env";

Bun.serve({ port: env.PORT, fetch: app.fetch });
console.log(`boss server listening on :${env.PORT}`);
