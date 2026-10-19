import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const localEnvPath = resolve(process.cwd(), ".env.local");
if (existsSync(localEnvPath)) {
  if (typeof process.loadEnvFile !== "function") {
    throw new Error(
      "The Vercel dev script requires Node.js 20.12 or newer to load .env.local safely.",
    );
  }
  process.loadEnvFile(localEnvPath);
}

const npmCliPath = process.env.npm_execpath;
if (!npmCliPath) {
  throw new Error("Run this script through `npm run dev:vercel`.");
}

const vercel = spawn(
  process.execPath,
  [npmCliPath, "exec", "--", "vercel", "dev", ...process.argv.slice(2)],
  {
    env: process.env,
    stdio: "inherit",
  },
);

vercel.on("error", (error) => {
  console.error("Unable to start Vercel Dev:", error.message);
  process.exitCode = 1;
});

vercel.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
