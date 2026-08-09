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
