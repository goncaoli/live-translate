const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

// Azure Functions Core Tools v4 doesn't yet support every Node major version
// (see https://aka.ms/functions-node-versions). If a portable Node 20 runtime
// was set up under .tools/node20-win-x64 (see README), prepend it to PATH so
// the local Functions host uses it instead of whatever Node is installed
// system-wide, without touching that global install.
const portableNodeDir = path.join(__dirname, "..", ".tools", "node20-win-x64");
const env = { ...process.env };
if (fs.existsSync(portableNodeDir)) {
  env.PATH = `${portableNodeDir};${env.PATH}`;
  console.log(`Using portable Node 20 for the Functions host: ${portableNodeDir}`);
} else {
  console.log("No portable Node 20 found under .tools/ — using system Node for everything.");
}

// `func start` runs whatever is already in api/dist — it doesn't compile TS
// on its own, so a stale dist/ silently serves outdated functions locally.
console.log("Building API...");
const build = spawnSync("npm run build --prefix api", { stdio: "inherit", shell: true, env });
if (build.status !== 0) process.exit(build.status ?? 1);

const command =
  'npx swa start http://localhost:5173 --api-location api --host 0.0.0.0 --swa-config-location client/public --run "npm run dev --prefix client"';
const child = spawn(command, { stdio: "inherit", shell: true, env });

child.on("exit", (code) => process.exit(code ?? 0));
