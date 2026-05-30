import { readFileSync } from "node:fs";
import { join } from "node:path";

let loaded = false;

export function loadLocalEnv() {
  if (loaded) return;
  loaded = true;

  try {
    const envPath = join(process.cwd(), ".env");
    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Hosted environments should provide env vars directly.
  }
}
