import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync, cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const project = path.join(root, "platforms/tauri");
const bins = path.join(project, "src-tauri/binaries");
mkdirSync(bins, { recursive: true });
const target = execFileSync("rustc", ["--print", "host-tuple"], { encoding: "utf8" }).trim();
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: "inherit" });
if (process.platform === "darwin") {
  const arch = process.env.TOKENPLAN_UNIVERSAL === "true" ? ["--arch", "arm64", "--arch", "x86_64"] : [];
  run("swift", ["build", "-c", "release", ...arch, "--product", "tokenplan-cli"]);
  const output = execFileSync("swift", ["build", "-c", "release", ...arch, "--show-bin-path"], { cwd: root, encoding: "utf8" }).trim();
  copyFileSync(path.join(output, "tokenplan-cli"), path.join(bins, `tokenplan-bridge-${target}`));
  run("install_name_tool", ["-add_rpath", "@executable_path/../Frameworks", path.join(bins, `tokenplan-bridge-${target}`)]);
  if (arch.length) for (const other of ["aarch64-apple-darwin", "x86_64-apple-darwin", "universal-apple-darwin"]) {
    if (other !== target) copyFileSync(path.join(bins, `tokenplan-bridge-${target}`), path.join(bins, `tokenplan-bridge-${other}`));
  }
  // SwiftPM resources are required for pricing, icons and provider data.
  cpSync(path.join(output, "OpenUsage_OpenUsage.bundle"), path.join(bins, "OpenUsage_OpenUsage.bundle"), { recursive: true });
  cpSync(path.join(output, "Sparkle.framework"), path.join(bins, "Sparkle.framework"), { recursive: true, dereference: false, verbatimSymlinks: true });
} else {
  const rid = `${process.platform === "win32" ? "win" : "linux"}-${process.arch === "arm64" ? "arm64" : "x64"}`;
  const output = path.join(bins, "dotnet");
  run(process.env.TOKENPLAN_DOTNET ?? "dotnet", ["publish", "platforms/desktop/TokenPlan.Bridge", "-c", "Release", "-r", rid,
    "--self-contained", "true", "-p:PublishSingleFile=true", "-p:IncludeNativeLibrariesForSelfExtract=true", "-o", output]);
  const suffix = process.platform === "win32" ? ".exe" : "";
  copyFileSync(path.join(output, `tokenplan-bridge${suffix}`), path.join(bins, `tokenplan-bridge-${target}${suffix}`));
}
