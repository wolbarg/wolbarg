/**
 * Wolbarg CLI — `wolbarg <command>`
 */

import { SDK_VERSION } from "../version.js";
import { initCommand } from "./init.js";

function printRootHelp(): void {
  console.log(`wolbarg ${SDK_VERSION}

Usage:
  wolbarg init [options]    Configure project database + embedding provider
  wolbarg --version         Print version
  wolbarg --help            Show help

Run \`wolbarg init --help\` for init options.
`);
}

export async function cliMain(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;

  if (!cmd || cmd === "-h" || cmd === "--help") {
    printRootHelp();
    return 0;
  }
  if (cmd === "-V" || cmd === "--version" || cmd === "version") {
    console.log(SDK_VERSION);
    return 0;
  }
  if (cmd === "init") {
    return initCommand(rest);
  }

  console.error(`Unknown command: ${cmd}`);
  printRootHelp();
  return 1;
}

cliMain(process.argv.slice(2))
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
