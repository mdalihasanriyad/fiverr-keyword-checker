import { execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const resultsDir = path.resolve(process.cwd(), "test-results");

function findLatestTrace(dir) {
  let latest = null;
  let latestTime = 0;

  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".zip")) {
        const mtime = statSync(full).mtimeMs;
        if (mtime > latestTime) {
          latestTime = mtime;
          latest = full;
        }
      }
    }
  }

  walk(dir);
  return latest;
}

try {
  const latest = findLatestTrace(resultsDir);
  if (!latest) {
    console.error("No trace .zip files found in test-results/. Run a failing E2E test first.");
    process.exit(1);
  }
  console.log(`Opening trace: ${latest}`);
  execSync(`npx playwright show-trace ${JSON.stringify(latest)}`, { stdio: "inherit" });
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
