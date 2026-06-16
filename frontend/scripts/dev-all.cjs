const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

const frontendDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(frontendDir, "..");
const backendDir = path.join(rootDir, "backend");
const aiDir = path.join(rootDir, "ai");
const isWindows = process.platform === "win32";

const children = [];
let shuttingDown = false;
const dryRun = process.argv.includes("--dry-run");

function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (open) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(700);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPort(port, label, timeoutMs = 45000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(port)) {
      console.log(`[dev] ${label} ready on http://localhost:${port}`);
      return true;
    }
    await sleep(500);
  }
  console.error(`[dev] Timed out waiting for ${label} on http://localhost:${port}`);
  shutdown(1);
  return false;
}

async function isLocalPortOpen(port) {
  return (await isPortOpen(port, "127.0.0.1")) || (await isPortOpen(port, "::1"));
}

function prefixOutput(stream, label) {
  let buffered = "";
  stream.on("data", (chunk) => {
    buffered += chunk.toString();
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`[${label}] ${line}`);
      }
    }
  });
  stream.on("end", () => {
    if (buffered.trim().length > 0) {
      console.log(`[${label}] ${buffered}`);
    }
  });
}

function commandName(command) {
  if (!isWindows) return command;
  if (command === "npm") return "npm.cmd";
  return command;
}

function quoteForCmd(value) {
  const text = String(value);
  if (!/[\s&()^|<>"]/g.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function startProcess(label, command, args, cwd, options = {}) {
  let resolvedCommand = commandName(command);
  let resolvedArgs = args;
  const usesCmdShim = isWindows && /\.(cmd|bat)$/i.test(resolvedCommand);

  if (usesCmdShim) {
    const commandLine = [quoteForCmd(resolvedCommand), ...args.map(quoteForCmd)].join(" ");
    resolvedArgs = ["/d", "/s", "/c", `"${commandLine}"`];
    resolvedCommand = "cmd.exe";
  }

  const child = spawn(resolvedCommand, resolvedArgs, {
    cwd,
    env: { ...process.env, ...options.env },
    shell: options.shell ?? false,
    windowsVerbatimArguments: usesCmdShim,
    windowsHide: true,
  });

  children.push({ label, child });
  prefixOutput(child.stdout, label);
  prefixOutput(child.stderr, label);

  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      console.log(`[dev] ${label} exited with ${reason}`);
      if (code && code !== 0) {
        shutdown(code);
      }
    }
  });

  child.on("error", (error) => {
    console.error(`[dev] Failed to start ${label}: ${error.message}`);
    shutdown(1);
  });

  return child;
}

function hasPlaceholder(value) {
  return Boolean(value) && (
    value.includes("<") ||
    value.includes(">") ||
    value.includes("project-ref") ||
    value.includes("your-supabase-db-password")
  );
}

function validateBackendEnvironment() {
  const names = [
    "SPRING_DATASOURCE_URL",
    "SPRING_DATASOURCE_USERNAME",
    "SPRING_DATASOURCE_PASSWORD",
  ];
  const badNames = names.filter((name) => hasPlaceholder(process.env[name] || ""));
  const url = process.env.SPRING_DATASOURCE_URL || "";
  const username = process.env.SPRING_DATASOURCE_USERNAME || process.env.POSTGRES_USER || "";
  const password = process.env.SPRING_DATASOURCE_PASSWORD || process.env.POSTGRES_PASSWORD || "";
  const usingSupabasePooler = /pooler\.supabase\.com/i.test(url);
  const missingPoolerCredentials = usingSupabasePooler && (!username || username === "postgres" || !password || password === "samia");

  if (badNames.length === 0 && !missingPoolerCredentials) return true;

  if (badNames.length > 0) {
    console.error(`[dev] Placeholder datasource environment values are still set: ${badNames.join(", ")}`);
  }
  if (missingPoolerCredentials) {
    console.error("[dev] SPRING_DATASOURCE_URL points to Supabase pooler, but tenant username/password are missing.");
  }
  console.error("[dev] Use real Supabase values, or remove all datasource overrides for local defaults:");
  for (const name of names) {
    console.error(`[dev]   Remove-Item Env:\\${name} -ErrorAction SilentlyContinue`);
  }
  process.exitCode = 1;
  return false;
}

function backendEnvironment() {
  const env = {
    SPRING_PROFILES_ACTIVE: process.env.SPRING_PROFILES_ACTIVE || "dev",
  };

  if (env.SPRING_PROFILES_ACTIVE.split(",").map((item) => item.trim()).includes("dev") && !process.env.SPRING_DATASOURCE_URL) {
    env.SPRING_DATASOURCE_URL = "jdbc:h2:file:./data/dev-supervision;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH";
    env.SPRING_DATASOURCE_USERNAME = "sa";
    env.SPRING_DATASOURCE_PASSWORD = "";
  }

  return env;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    if (!child.killed) {
      if (isWindows) {
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
      } else {
        child.kill("SIGTERM");
      }
    }
  }
  setTimeout(() => process.exit(code), 250);
}

async function main() {
  console.log("[dev] Starting OCP SynaptiQ stack");

  if (await isLocalPortOpen(8080)) {
    console.log("[dev] Backend already running on http://localhost:8080");
  } else if (dryRun) {
    console.log("[dev] Would start backend on http://localhost:8080");
  } else {
    if (!validateBackendEnvironment()) {
      return;
    }
    const mvnw = isWindows ? "mvnw.cmd" : "./mvnw";
    startProcess("backend", path.join(backendDir, mvnw), ["spring-boot:run"], backendDir, { env: backendEnvironment() });
    await waitForPort(8080, "Backend");
  }

  if (await isLocalPortOpen(5001)) {
    console.log("[dev] AI service already running on http://localhost:5001");
  } else if (dryRun) {
    console.log("[dev] Would start AI service on http://localhost:5001");
  } else {
    startProcess("ai", process.env.PYTHON || "python", ["app/app.py"], aiDir);
    await waitForPort(5001, "AI service");
  }

  if (dryRun) {
    console.log("[dev] Would start frontend Vite dev server");
    return;
  }

  if (await isLocalPortOpen(5173)) {
    console.log("[dev] Frontend already running on http://localhost:5173");
  } else {
    startProcess("frontend", "npm", ["run", "dev:vite"], frontendDir);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("uncaughtException", (error) => {
  console.error(`[dev] ${error.stack || error.message}`);
  shutdown(1);
});

main().catch((error) => {
  console.error(`[dev] ${error.stack || error.message}`);
  shutdown(1);
});
