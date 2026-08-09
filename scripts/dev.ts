import { fileURLToPath } from "node:url";

// One command for the three-process dev loop: server, worker and web run
// together, every output line carries its owner's prefix, one Ctrl-C stops
// all three, and the first child to die takes the rest down with it.
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

interface DevProcess {
  readonly prefix: string;
  readonly command: readonly string[];
}

const definitions: readonly DevProcess[] = [
  { prefix: "server", command: ["bun", "apps/server/src/main.ts"] },
  { prefix: "worker", command: ["bun", "apps/server/src/worker.ts"] },
  {
    prefix: "web",
    command: ["bunx", "vite", "--config", "apps/web/vite.config.ts"],
  },
];

async function forwardLines(
  stream: ReadableStream<Uint8Array>,
  prefix: string,
  write: (line: string) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let unfinishedLine = "";
  for await (const chunk of stream) {
    unfinishedLine += decoder.decode(chunk, { stream: true });
    const lines = unfinishedLine.split("\n");
    unfinishedLine = lines.pop() ?? "";
    for (const line of lines) {
      write(`[${prefix}] ${line}`);
    }
  }
  if (unfinishedLine !== "") {
    write(`[${prefix}] ${unfinishedLine}`);
  }
}

// Leftovers of a previous dev run are stopped before starting; anything
// foreign on a dev port is a named refusal — this script never kills what
// it did not shape. Ports mirror the env defaults; 5173 is vite's own.
const devPorts = [
  Number(process.env.PORT ?? 3000),
  Number(process.env.WORKER_PORT ?? 3001),
  5173,
];

const ourProcessMarkers = [
  "apps/server/src/main.ts",
  "apps/server/src/worker.ts",
  "apps/web/vite.config.ts",
];

interface PortHolder {
  readonly port: number;
  readonly pid: number;
  readonly command: string;
}

function listeningPids(port: number): number[] {
  const result = Bun.spawnSync([
    "lsof",
    "-nP",
    `-tiTCP:${port}`,
    "-sTCP:LISTEN",
  ]);
  const text = result.stdout.toString().trim();
  if (text === "") {
    return [];
  }
  return text
    .split("\n")
    .map((line) => Number.parseInt(line.trim(), 10))
    .filter((pid) => Number.isFinite(pid));
}

function commandOf(pid: number): string {
  const result = Bun.spawnSync(["ps", "-o", "command=", "-p", String(pid)]);
  return result.stdout.toString().trim();
}

function collectHolders(): PortHolder[] {
  return devPorts.flatMap((port) =>
    listeningPids(port).map((pid) => ({ port, pid, command: commandOf(pid) })),
  );
}

const holders = collectHolders();
const foreignHolders = holders.filter(
  (holder) => !ourProcessMarkers.some((mark) => holder.command.includes(mark)),
);
if (foreignHolders.length > 0) {
  for (const holder of foreignHolders) {
    console.error(
      `[dev] port ${holder.port} is held by a foreign process ${holder.pid}: ${holder.command}`,
    );
  }
  console.error("[dev] refusing to kill it; free the port and retry");
  process.exit(1);
}
for (const holder of holders) {
  console.log(
    `[dev] stopping leftover ${holder.pid} on :${holder.port} (${holder.command})`,
  );
  process.kill(holder.pid, "SIGTERM");
}
if (holders.length > 0) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline && collectHolders().length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const stubborn = collectHolders();
  for (const holder of stubborn) {
    console.error(
      `[dev] port ${holder.port} still held by ${holder.pid} after SIGTERM; giving up`,
    );
  }
  if (stubborn.length > 0) {
    process.exit(1);
  }
}

const running = definitions.map((definition) => {
  const child = Bun.spawn([...definition.command], {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  void forwardLines(child.stdout, definition.prefix, console.log);
  void forwardLines(child.stderr, definition.prefix, console.error);
  return { definition, child };
});

let interrupted = false;
function stopAll(): void {
  for (const { child } of running) {
    child.kill("SIGTERM");
  }
}
process.on("SIGINT", () => {
  interrupted = true;
  stopAll();
});
process.on("SIGTERM", () => {
  interrupted = true;
  stopAll();
});

const firstExit = await Promise.race(
  running.map(async ({ definition, child }) => ({
    prefix: definition.prefix,
    code: await child.exited,
  })),
);
if (!interrupted) {
  console.error(
    `[dev] ${firstExit.prefix} exited with ${firstExit.code}; stopping the rest`,
  );
  stopAll();
}
await Promise.all(running.map(({ child }) => child.exited));
process.exit(interrupted ? 0 : firstExit.code);
